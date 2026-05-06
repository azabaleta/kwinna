import type { NextFunction, Request, Response } from "express";
import type { SaleOrderInput, SaleStatus } from "@kwinna/contracts";
import { SaleStatusSchema } from "@kwinna/contracts";
import { cancelSaleAndRestoreStock, createSale, createPendingSale, dismissSale } from "../services/sale.service";
import { createMPPreference, getMPPayment, verifyMPSignature, searchApprovedPayment } from "../services/mp.service";
import { findAllSales, findSaleById, findWebOrdersToProcess, updateSaleStatus, findPendingSalesByEmail } from "../db/repositories/sale.repository";
import { sendSaleConfirmationEmail } from "../services/email.service";
import { insertAnalyticsEvent } from "../db/repositories/analytics.repository";

// ─── POST /sales ──────────────────────────────────────────────────────────────
// Venta directa POS — crea la venta como `completed` de inmediato.
// Accesible sin autenticación; optionalAuth extrae userId si hay JWT.

export async function postSale(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as SaleOrderInput;
    // El userId del body se ignora — siempre se usa el del JWT para evitar
    // que un cliente anónimo vincule una venta a otro usuario del sistema.
    const sale = await createSale({ ...input, userId: req.user?.sub });
    res.status(201).json({ data: sale });

    // Fire-and-forget — no bloqueamos la respuesta ni tumbamos el servidor
    sendSaleConfirmationEmail(sale).catch((err: Error) =>
      console.error("[Email] Error enviando confirmación POS:", err.message)
    );
  } catch (err) {
    const typed = err as Error & { statusCode?: number };
    if (typed.statusCode) res.status(typed.statusCode);
    next(err);
  }
}

// ─── POST /sales/checkout ─────────────────────────────────────────────────────
// Checkout web con MercadoPago Checkout Pro.
//
// Flujo:
//   1. Crea la venta en BD con status = "pending" (reserva de inventario).
//   2. Crea una Preference en MP con external_reference = sale.id.
//   3. Devuelve { sale, initPoint } al frontend.
//   4. El webhook de MP actualiza el status a "completed" al aprobarse el pago.

export async function postCheckout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as SaleOrderInput;
    const userId = input.userId ?? req.user?.sub;

    // 1 — Crear venta pending + descontar stock (atómico)
    const sale = await createPendingSale({ ...input, userId });

    let point: string | undefined = undefined;

    if (input.paymentMethod !== "transfer") {
      // 2 — Crear Preference en MP
      const { sandboxInitPoint, initPoint } = await createMPPreference(sale);

      // Usar sandbox en desarrollo/test, producción en live
      const isSandbox = (process.env["MP_ACCESS_TOKEN"] ?? "").startsWith("TEST-");
      point = isSandbox ? sandboxInitPoint : initPoint;
    }

    res.status(201).json({
      data: { sale, initPoint: point },
    });

    // Fire-and-forget: Limpieza de órdenes pendientes abandonadas
    cleanupAbandonedPendingOrders(input.customerEmail, sale.id).catch((err) => 
      console.error("[Cleanup] Error al limpiar órdenes pendientes:", err)
    );
  } catch (err) {
    const typed = err as Error & { statusCode?: number };
    if (typed.statusCode) res.status(typed.statusCode);
    next(err);
  }
}

// ─── BACKGROUND JOBS ──────────────────────────────────────────────────────────

/**
 * Job en segundo plano para limpiar órdenes pendientes anteriores de un mismo email.
 * - Si MP dice que se pagó -> se completa.
 * - Si MP dice que no -> se cancela y se restaura el stock.
 */
async function cleanupAbandonedPendingOrders(customerEmail: string, currentSaleId: string): Promise<void> {
  const pendingSales = await findPendingSalesByEmail(customerEmail);
  const oldSales = pendingSales.filter(s => s.id !== currentSaleId && !s.isDismissed);

  if (oldSales.length === 0) return;

  console.log(`[Cleanup] Revisando ${oldSales.length} órdenes pendientes para ${customerEmail}`);

  for (const oldSale of oldSales) {
    try {
      // Re-verificar status fresco para evitar race condition si este job corre
      // en paralelo con otro checkout del mismo usuario.
      const freshSale = await findSaleById(oldSale.id);
      if (!freshSale || freshSale.status !== "pending") {
        console.log(`[Cleanup] Orden ${oldSale.id} ya no está pending — omitida.`);
        continue;
      }

      // Las órdenes de transferencia requieren aprobación manual del admin.
      // Nunca se cancelan automáticamente: el cliente puede haber transferido
      // el dinero antes de volver a crear una nueva orden.
      if (freshSale.paymentMethod === "transfer") {
        console.log(`[Cleanup] Orden ${oldSale.id} es por transferencia — omitida para revisión manual.`);
        continue;
      }

      const approvedPayment = await searchApprovedPayment(oldSale.id);

      if (approvedPayment) {
        const completed = await updateSaleStatus(oldSale.id, "completed");
        if (completed) {
          sendSaleConfirmationEmail(completed).catch(() => {});
          insertAnalyticsEvent("sale_complete", "mp-reconcile-auto-" + oldSale.id, completed.userId).catch(() => {});
          console.log(`[Cleanup] Orden ${oldSale.id} tenía pago aprobado. Actualizada a completed.`);
        }
      } else {
        await cancelSaleAndRestoreStock(oldSale.id);
        console.log(`[Cleanup] Orden ${oldSale.id} sin pago aprobado. Cancelada y stock restaurado.`);
      }
    } catch (err) {
      console.error(`[Cleanup] Error procesando orden antigua ${oldSale.id}:`, err);
    }
  }
}

// ─── POST /sales/webhook ──────────────────────────────────────────────────────
// Receptor de notificaciones de pago de MercadoPago (Webhooks v2 + IPN legacy).
//
// Seguridad:
//   1. Verifica la firma HMAC-SHA256 del header `x-signature` si MP_WEBHOOK_SECRET
//      está configurado. Sin secret (dev/sandbox), se acepta la notificación.
//   2. Re-valida el estado del pago consultando la API de MP (nunca confiamos
//      solo en el body del webhook).
//   3. Solo actualiza el status si el pago está "approved".
//
// MP siempre espera HTTP 200; cualquier otro código hace que reintente.

export async function postWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Responder 200 inmediatamente — MP reintenta si tarda > 22 s
  res.sendStatus(200);

  try {
    // ── Log de entrada — visible en Railway Logs ────────────────────────────
    console.log("[Webhook] Notificación recibida", JSON.stringify({
      body:  req.body,
      query: req.query,
      headers: {
        "x-signature":  req.headers["x-signature"]  ?? "(ausente)",
        "x-request-id": req.headers["x-request-id"] ?? "(ausente)",
      },
    }));

    // ── Extraer payment ID ──────────────────────────────────────────────────
    const body = req.body as {
      type?:   string;
      action?: string;
      data?:   { id?: string };
    };

    const isPaymentEvent =
      body.type === "payment" ||
      (req.query["topic"] === "payment" && typeof req.query["id"] === "string");

    if (!isPaymentEvent) {
      console.warn("[Webhook] Ignorado: no es un evento de pago", { type: body.type, topic: req.query["topic"] });
      return;
    }

    const rawId =
      body.data?.id ??
      (typeof req.query["id"] === "string" ? req.query["id"] : undefined);

    if (!rawId) {
      console.warn("[Webhook] Ignorado: no se encontró payment ID en body ni en query");
      return;
    }

    const paymentId = Number(rawId);
    if (!Number.isFinite(paymentId)) {
      console.warn("[Webhook] Ignorado: payment ID no es un número válido", { rawId });
      return;
    }

    console.log("[Webhook] Procesando payment ID:", paymentId);

    // ── Verificar firma HMAC-SHA256 ────────────────────────────────────────
    const xSignature  = String(req.headers["x-signature"]  ?? "");
    const xRequestId  = String(req.headers["x-request-id"] ?? "");
    const hasSecret   = !!process.env["MP_WEBHOOK_SECRET"];

    if (hasSecret) {
      if (!xSignature || !xRequestId) {
        console.warn("[Webhook] Ignorado: MP_WEBHOOK_SECRET configurado pero faltan headers de firma (x-signature / x-request-id)");
        return;
      }
      const valid = verifyMPSignature({ xSignature, xRequestId, dataId: rawId });
      if (!valid) {
        console.warn("[Webhook] Ignorado: firma HMAC-SHA256 inválida");
        return;
      }
      console.log("[Webhook] Firma HMAC verificada correctamente");
    } else {
      console.log("[Webhook] Sin MP_WEBHOOK_SECRET — verificación de firma omitida (sandbox/dev)");
    }

    // ── Re-validar estado del pago en la API de MP ──────────────────────────
    const payment = await getMPPayment(paymentId);
    console.log("[Webhook] Estado del pago consultado en MP:", {
      id:                payment.id,
      status:            payment.status,
      externalReference: payment.externalReference,
    });

    if (payment.status !== "approved") {
      console.warn("[Webhook] Ignorado: estado del pago no es 'approved'", { status: payment.status });
      return;
    }

    const saleId = payment.externalReference;
    if (!saleId) {
      console.warn("[Webhook] Ignorado: pago aprobado sin external_reference — no se puede identificar la orden");
      return;
    }

    // ── Actualizar sale de pending → completed ──────────────────────────────
    const existing = await findSaleById(saleId);
    if (!existing) {
      console.warn("[Webhook] Ignorado: no se encontró orden con ID", { saleId });
      return;
    }

    if (existing.status === "completed") {
      console.log("[Webhook] Idempotencia: la orden ya estaba en estado 'completed'", { saleId });
      return;
    }

    const completed = await updateSaleStatus(saleId, "completed");
    console.log("[Webhook] ✅ Orden actualizada a 'completed'", { saleId });

    // Fire-and-forget — ya respondimos 200, el error no puede afectar a MP
    if (completed) {
      sendSaleConfirmationEmail(completed).catch((err: Error) =>
        console.error("[Email] Error enviando confirmación MP:", err.message)
      );
      insertAnalyticsEvent("sale_complete", "mp-" + saleId, completed.userId).catch(() => {});
    }

  } catch (err) {
    console.error("[Webhook] Error inesperado procesando notificación:", err);
    next(err);
  }
}

// ─── GET /sales ───────────────────────────────────────────────────────────────
// Lista todas las ventas con PII completa.
// Solo accesible para admin/operator (protegido en routes con requireRole).

export async function getSales(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sales = await findAllSales();
    res.json({ data: sales });
  } catch (err) {
    next(err);
  }
}

// ─── GET /sales/web-orders ────────────────────────────────────────────────────
// Lista pedidos web en estado completed o assembled (para la vista POS).
// Solo admin/operator.

export async function getWebOrders(
  _req: Request,
  res:  Response,
  next: NextFunction
): Promise<void> {
  try {
    const sales = await findWebOrdersToProcess();
    res.json({ data: sales });
  } catch (err) {
    next(err);
  }
}

// ─── GET /sales/:id ───────────────────────────────────────────────────────────
// Público — usado en la success page del checkout.
// Devuelve únicamente los campos necesarios para esa pantalla.
// Los datos PII (email, teléfono, DNI, dirección) se omiten para evitar
// que cualquier persona con un UUID pueda acceder a datos personales del comprador.
export async function getSale(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const sale = await findSaleById(id);
    if (!sale) {
      res.status(404).json({ error: "Venta no encontrada" });
      return;
    }

    res.json({
      data: {
        id:            sale.id,
        status:        sale.status,
        total:         sale.total,
        shippingCost:  sale.shippingCost,
        shippingMethod: sale.shippingMethod,
        paymentMethod: sale.paymentMethod,
        channel:       sale.channel,
        items:         sale.items,
        customerName:  sale.customerName,
        createdAt:     sale.createdAt,
        isDismissed:   sale.isDismissed,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /sales/:id/status ──────────────────────────────────────────────────
// Actualiza el status de una venta (ej: completed → assembled desde el POS).
// Solo admin/operator.

// Transiciones de estado permitidas. Solo las listadas aquí son válidas.
// Previene cambios imposibles como cancelled → completed que dejarían el stock inconsistente.
const VALID_TRANSITIONS: Partial<Record<SaleStatus, SaleStatus[]>> = {
  pending:   ["completed", "cancelled"],
  completed: ["assembled"],
};

export async function patchSaleStatus(
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: SaleStatus };

    const parsed = SaleStatusSchema.safeParse(status);
    if (!parsed.success) {
      res.status(400).json({ error: "Estado inválido", detail: parsed.error.issues });
      return;
    }

    const existing = await findSaleById(id);
    if (!existing) {
      res.status(404).json({ error: "Venta no encontrada" });
      return;
    }

    const allowed = VALID_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(parsed.data)) {
      res.status(422).json({
        error: `Transición de estado inválida: ${existing.status} → ${parsed.data}`,
      });
      return;
    }

    const sale = await updateSaleStatus(id, parsed.data);
    res.json({ data: sale });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /sales/:id/cancel ────────────────────────────────────────────────────
// Cancela una venta pending y restaura el stock por talle.
// Solo admin/operator (protegido en routes con requireRole).

export async function cancelSale(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const sale = await cancelSaleAndRestoreStock(id);
    res.json({ data: sale });
  } catch (err) {
    const typed = err as Error & { statusCode?: number };
    if (typed.statusCode) res.status(typed.statusCode);
    next(err);
  }
}

// ─── PATCH /sales/:id/dismiss ──────────────────────────────────────────────────
// Desestima una venta para excluirla de las métricas.
// Solo admin/operator.

import { SaleDismissInputSchema } from "@kwinna/contracts";

export async function patchSaleDismiss(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    
    const parsed = SaleDismissInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Datos inválidos", detail: parsed.error.issues });
      return;
    }

    const { reason, restoreStock } = parsed.data;
    const sale = await dismissSale(id, reason, restoreStock);
    
    res.json({ data: sale });
  } catch (err) {
    const typed = err as Error & { statusCode?: number };
    if (typed.statusCode) res.status(typed.statusCode);
    next(err);
  }
}

// ─── POST /sales/:id/reconcile ────────────────────────────────────────────────
// Reconcilia manualmente el pago de una orden 'pending' consultando la API de MP.
// Solo admin/operator.

export async function postReconcile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as { id: string };

    const sale = await findSaleById(id);
    if (!sale) {
      res.status(404).json({ error: "Venta no encontrada" });
      return;
    }

    if (sale.status !== "pending") {
      res.status(400).json({ error: `La venta ya se encuentra en estado ${sale.status}` });
      return;
    }

    const approvedPayment = await searchApprovedPayment(id);

    if (!approvedPayment) {
      res.status(404).json({ error: "No se encontró un pago aprobado en MercadoPago para esta orden" });
      return;
    }

    const completed = await updateSaleStatus(id, "completed");
    if (!completed) {
      res.status(500).json({ error: "Error al actualizar el estado de la orden" });
      return;
    }

    // Fire-and-forget
    sendSaleConfirmationEmail(completed).catch((err: Error) =>
      console.error("[Email] Error enviando confirmación post-reconciliación:", err.message)
    );
    insertAnalyticsEvent("sale_complete", "mp-reconcile-" + id, completed.userId).catch(() => {});

    res.json({ data: completed });
  } catch (err) {
    next(err);
  }
}

// ─── POST /sales/:id/approve-transfer ───────────────────────────────────────
// Aprueba manualmente una transferencia bancaria y completa la orden.
export async function postApproveTransfer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as { id: string };

    const sale = await findSaleById(id);
    if (!sale) {
      res.status(404).json({ error: "Venta no encontrada" });
      return;
    }

    if (sale.status !== "pending") {
      res.status(400).json({ error: `La venta ya se encuentra en estado ${sale.status}` });
      return;
    }

    if (sale.paymentMethod !== "transfer") {
      res.status(400).json({ error: "Esta orden no es por transferencia bancaria" });
      return;
    }

    const completed = await updateSaleStatus(id, "completed");
    if (!completed) {
      res.status(500).json({ error: "Error al actualizar el estado de la orden" });
      return;
    }

    // Fire-and-forget
    sendSaleConfirmationEmail(completed).catch((err: Error) =>
      console.error("[Email] Error enviando confirmación post-aprobación:", err.message)
    );
    insertAnalyticsEvent("sale_complete", "transfer-approve-" + id, completed.userId).catch(() => {});

    res.json({ data: completed });
  } catch (err) {
    next(err);
  }
}
