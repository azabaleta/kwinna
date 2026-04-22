import type { NextFunction, Request, Response } from "express";
import type { SaleOrderInput, SaleStatus } from "@kwinna/contracts";
import { SaleStatusSchema } from "@kwinna/contracts";
import { cancelSaleAndRestoreStock, createSale, createPendingSale } from "../services/sale.service";
import { createMPPreference, getMPPayment, verifyMPSignature } from "../services/mp.service";
import { findAllSales, findSaleById, findWebOrdersToProcess, updateSaleStatus } from "../db/repositories/sale.repository";
import { sendSaleConfirmationEmail } from "../services/email.service";

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
    const sale = await createSale({ ...input, userId: input.userId ?? req.user?.sub });
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

    // 2 — Crear Preference en MP
    const { sandboxInitPoint, initPoint } = await createMPPreference(sale);

    // Usar sandbox en desarrollo/test, producción en live
    const isSandbox = (process.env["MP_ACCESS_TOKEN"] ?? "").startsWith("TEST-");
    const point = isSandbox ? sandboxInitPoint : initPoint;

    res.status(201).json({
      data: { sale, initPoint: point },
    });
  } catch (err) {
    const typed = err as Error & { statusCode?: number };
    if (typed.statusCode) res.status(typed.statusCode);
    next(err);
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
    // ── Extraer payment ID ──────────────────────────────────────────────────
    // Webhooks v2 body: { type: "payment", data: { id: "123" }, action: "..." }
    // IPN legacy query: ?topic=payment&id=123
    const body = req.body as {
      type?:   string;
      action?: string;
      data?:   { id?: string };
    };

    const isPaymentEvent =
      body.type === "payment" ||
      (req.query["topic"] === "payment" && typeof req.query["id"] === "string");

    if (!isPaymentEvent) return;

    const rawId =
      body.data?.id ??
      (typeof req.query["id"] === "string" ? req.query["id"] : undefined);

    if (!rawId) return;

    const paymentId = Number(rawId);
    if (!Number.isFinite(paymentId)) return;

    // ── Verificar firma HMAC-SHA256 ────────────────────────────────────────
    // Si MP_WEBHOOK_SECRET está configurado, la firma es OBLIGATORIA.
    // Sin secret (dev/sandbox), se acepta sin verificar.
    const xSignature  = String(req.headers["x-signature"]  ?? "");
    const xRequestId  = String(req.headers["x-request-id"] ?? "");
    const hasSecret   = !!process.env["MP_WEBHOOK_SECRET"];

    if (hasSecret) {
      if (!xSignature || !xRequestId) return; // firma ausente → rechazar silenciosamente
      const valid = verifyMPSignature({ xSignature, xRequestId, dataId: rawId });
      if (!valid) return;
    }

    // ── Re-validar estado del pago en la API de MP ──────────────────────────
    const payment = await getMPPayment(paymentId);

    if (payment.status !== "approved") return;

    const saleId = payment.externalReference;
    if (!saleId) return;

    // ── Actualizar sale de pending → completed ──────────────────────────────
    const existing = await findSaleById(saleId);
    if (!existing) return;

    if (existing.status === "completed") return; // idempotencia

    const completed = await updateSaleStatus(saleId, "completed");

    // Fire-and-forget — ya respondimos 200, el error no puede afectar a MP
    if (completed) {
      sendSaleConfirmationEmail(completed).catch((err: Error) =>
        console.error("[Email] Error enviando confirmación MP:", err.message)
      );
    }

  } catch (err) {
    // No re-lanzamos — ya enviamos 200. Solo loguear para debugging.
    console.error("[Webhook] Error procesando notificación:", err);
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

// ─── PATCH /sales/:id/status ──────────────────────────────────────────────────
// Actualiza el status de una venta (ej: completed → assembled desde el POS).
// Solo admin/operator.

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

    const sale = await updateSaleStatus(id, parsed.data);
    if (!sale) {
      res.status(404).json({ error: "Venta no encontrada" });
      return;
    }

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
