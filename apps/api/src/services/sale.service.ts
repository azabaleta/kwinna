import { and, eq, inArray, sql } from "drizzle-orm";
import type { CreditNote, Sale, SaleItem, SaleOrderInput } from "@kwinna/contracts";
import { LIBRE_PRODUCT_ID, TRANSFER_DISCOUNT_RATE, applyPriceTier, paymentMethodsForTier } from "@kwinna/contracts";
import { db } from "../db";
import { mapSaleRow } from "../db/repositories";
import { generateCreditNoteCode, mapCreditNoteRow } from "../db/repositories/credit-note.repository";
import { incrementPromoCodeUsage } from "../db/repositories/promo-code.repository";
import { findSaleById } from "../db/repositories/sale.repository";
import { creditNotesTable, productsTable, promotionalCodesTable, salesTable, stockMovementsTable, stockTable, usersTable } from "../db/schema";
import { computeShippingCost } from "./shipping.service";
import { resolvePromoForSale } from "./promo-code.service";

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Deduce stock for a single order item inside an open transaction.
 * Throws 409 if stock is insufficient.
 */
async function deductStockItem(
  tx:   Parameters<Parameters<typeof db.transaction>[0]>[0],
  item: SaleOrderInput["items"][number]
): Promise<void> {
  if (item.size) {
    const [stockRow] = await tx
      .select()
      .from(stockTable)
      .where(and(
        eq(stockTable.productId, item.productId),
        eq(stockTable.size, item.size),
      ))
      .for("update");

    if (!stockRow || stockRow.quantity < item.quantity) {
      throw Object.assign(
        new Error("Stock insuficiente para uno o más productos del pedido"),
        { statusCode: 409 }
      );
    }

    await tx
      .update(stockTable)
      .set({ quantity: sql`${stockTable.quantity} - ${item.quantity}`, updatedAt: new Date() })
      .where(eq(stockTable.id, stockRow.id));

  } else {
    const rows = await tx
      .select()
      .from(stockTable)
      .where(eq(stockTable.productId, item.productId))
      .for("update");

    const totalAvailable = rows.reduce((sum, r) => sum + r.quantity, 0);

    if (rows.length === 0 || totalAvailable < item.quantity) {
      throw Object.assign(
        new Error("Stock insuficiente para uno o más productos del pedido"),
        { statusCode: 409 }
      );
    }

    const sorted = [...rows].sort((a, b) => b.quantity - a.quantity);
    let remaining = item.quantity;

    for (const stockRow of sorted) {
      if (remaining <= 0) break;
      const deduct = Math.min(stockRow.quantity, remaining);
      await tx
        .update(stockTable)
        .set({ quantity: sql`${stockTable.quantity} - ${deduct}`, updatedAt: new Date() })
        .where(eq(stockTable.id, stockRow.id));
      remaining -= deduct;
    }
  }

  await tx.insert(stockMovementsTable).values({
    productId: item.productId,
    size:      item.size ?? "",
    type:      "out",
    quantity:  item.quantity,
    reason:    "sale",
    createdAt: new Date(),
  });
}

// ─── createSale ───────────────────────────────────────────────────────────────

/**
 * Crea una venta POS con status `completed`.
 *
 * ANTI-FRAUDE: los precios se leen de PostgreSQL — el cliente solo envía
 * (productId, quantity, size). `unitPrice`, `subtotal`, `total` y
 * `shippingCost` son calculados exclusivamente por el backend.
 *
 * Flujo:
 *   1. Resuelve precios reales desde `products` en la misma transacción.
 *   2. Verifica y descuenta stock por talle (o greedy para accesorios).
 *   3. Calcula shippingCost a partir de la ciudad (fuente: shipping.service).
 *   4. Inserta la venta con los valores computados.
 */
export async function createSale(
  input: SaleOrderInput
): Promise<{ sale: Sale; residualCreditNote?: CreditNote }> {
  let residualCreditNote: CreditNote | undefined;

  // Resolve shipping cost and promo code before opening the transaction (read-only).
  const isPickup    = input.shippingMethod === "pickup";
  const shippingCost = isPickup ? 0 : await computeShippingCost(input.shippingCity ?? "");

  const promoResolved = input.promoCode
    ? await resolvePromoForSale(input.promoCode, input.paymentMethod ?? "")
    : null;

  const row = await db.transaction(async (tx) => {

    // 1 — Check customer ban (solo web) ──────────────────────────────────
    if (input.channel !== "pos") {
      const [user] = await tx
        .select({ isActive: usersTable.isActive })
        .from(usersTable)
        .where(eq(usersTable.email, input.customerEmail.toLowerCase()));
      if (user && !user.isActive) {
        throw Object.assign(
          new Error("Esta cuenta se encuentra suspendida."),
          { statusCode: 403 }
        );
      }
    }

    // 2 — Resolver precios reales desde la BD ─────────────────────────────
    const productIds = [...new Set(input.items.map((i) => i.productId))];

    const priceRows = await tx
      .select({ id: productsTable.id, price: productsTable.price })
      .from(productsTable)
      .where(inArray(productsTable.id, productIds));

    const priceMap = new Map(priceRows.map((r) => [r.id, Number(r.price)]));

    for (const item of input.items) {
      if (!priceMap.has(item.productId)) {
        throw Object.assign(
          new Error(`Producto no encontrado: ${item.productId}`),
          { statusCode: 404 }
        );
      }
    }

    // 3 — Deducir stock y construir SaleItems con precios verificados ──────
    const saleItems: SaleItem[] = [];

    // priceTier solo aplica en ventas POS (indicado por presencia de vendorId).
    // Ignorarlo si llega desde un cliente web sin vendorId evita que un cliente
    // anónimo obtenga descuentos de mayorista/efectivo manipulando el payload.
    //
    // Artículos libres: si la venta incluye ≥1 artículo libre, TODA la venta se
    // fija en la columna "efectivo" (los productos de catálogo pierden lista/mayorista)
    // y el precio manual del libre se respeta tal cual (ver loop de customItems).
    const hasCustomItems = !!(input.customItems?.length && input.channel === "pos" && input.vendorId);
    const effectiveTier = input.vendorId
      ? (hasCustomItems ? "efectivo" : input.priceTier)
      : undefined;

    // Guard de método de pago (solo POS, identificado por vendorId): los métodos
    // disponibles derivan de la columna de precios (efectiveTier). `orden_de_compra`
    // siempre permitido; `por_devolucion` solo al canjear una nota de crédito.
    // Con artículo libre effectiveTier="efectivo" → queda {efectivo, transferencia}.
    const isPos = !!input.vendorId;
    const paymentMethods = input.paymentBreakdown?.length
      ? input.paymentBreakdown.map((p) => p.method)
      : (input.paymentMethod ? [input.paymentMethod] : []);

    if (isPos && paymentMethods.length) {
      const allowedPayments = new Set<string>([
        ...paymentMethodsForTier(effectiveTier),
        "orden_de_compra",
        ...(input.creditNoteId ? ["por_devolucion"] : []),
      ]);
      for (const method of paymentMethods) {
        if (!allowedPayments.has(method)) {
          throw Object.assign(
            new Error(`Método de pago no permitido para esta lista de precios: ${method}`),
            { statusCode: 422 }
          );
        }
      }
    }

    for (const item of input.items) {
      await deductStockItem(tx, item);

      const unitPrice = applyPriceTier(priceMap.get(item.productId)!, effectiveTier);

      saleItems.push({
        productId: item.productId,
        quantity:  item.quantity,
        unitPrice,
        subtotal:  unitPrice * item.quantity,
        size:      item.size,
      });
    }

    // 3b — Artículos libres (sin catálogo, sin descuento de stock) ─────────
    // Solo cuando el operador POS está identificado (vendorId) para evitar
    // que un cliente web inyecte precios arbitrarios.
    if (input.customItems?.length && input.channel === "pos" && input.vendorId) {
      for (const custom of input.customItems) {
        // Precio manual — nunca afectado por la lista de precios.
        const unitPrice = custom.unitPrice;
        saleItems.push({
          productId: LIBRE_PRODUCT_ID,
          quantity:  custom.quantity,
          unitPrice,
          subtotal:  unitPrice * custom.quantity,
          name:      custom.description,
        });
      }
    }

    // 4 — Calcular totales en el servidor ─────────────────────────────────
    // shippingCost resuelto antes de la transacción (ver arriba).

    const itemsTotal      = saleItems.reduce((sum, i) => sum + i.subtotal, 0);
    const transferDiscount = (!effectiveTier && input.paymentMethod === "transfer") ? itemsTotal * TRANSFER_DISCOUNT_RATE : 0;

    let promoDiscount = 0;
    if (promoResolved) {
      if (promoResolved.discountType === "percentage") {
        // Porcentaje: se suma al 20% de transferencia (aplica sobre itemsTotal)
        promoDiscount = itemsTotal * (promoResolved.discountValue / 100);
      } else {
        // Monto fijo: aplica sobre el remanente post-transferencia
        const base = itemsTotal - transferDiscount;
        promoDiscount = Math.min(promoResolved.discountValue, base);
      }
    }

    const total = itemsTotal - transferDiscount - promoDiscount + shippingCost;

    // 4b — Validar y normalizar el desglose de pago POS ───────────────────────
    // Caso normal (sin nota de crédito): los montos deben sumar el total de ítems
    // (lo que el operador reparte en pantalla), con tolerancia de $1 por redondeo.
    if (isPos && input.paymentBreakdown?.length && !input.creditNoteId) {
      const paidSum = input.paymentBreakdown.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(paidSum - itemsTotal) > 1) {
        throw Object.assign(
          new Error("El desglose de pago no coincide con el total de la venta"),
          { statusCode: 422 }
        );
      }
    }

    // Método primario (dominante) para reportes/compat: el de mayor monto del
    // desglose; si no hay desglose se usa el paymentMethod recibido.
    const primaryPaymentMethod = input.paymentBreakdown?.length
      ? [...input.paymentBreakdown].sort((a, b) => b.amount - a.amount)[0]!.method
      : input.paymentMethod;

    // 5 — Insertar venta ───────────────────────────────────────────────────
    const [inserted] = await tx
      .insert(salesTable)
      .values({
        items:            saleItems,
        total:            total.toString(),
        status:           "completed",
        customerName:     input.customerName,
        customerEmail:    input.customerEmail,
        customerPhone:    input.customerPhone,
        customerDni:      input.customerDni,
        shippingAddress:  input.shippingAddress  ?? "",
        shippingCity:     input.shippingCity     ?? "",
        shippingProvince: input.shippingProvince ?? "",
        shippingZipCode:  input.shippingZipCode  ?? "",
        shippingMethod:   input.shippingMethod   ?? "delivery",
        shippingCost:     shippingCost.toString(),
        userId:           input.userId,
        posCustomerId:    input.posCustomerId,
        vendorId:         input.vendorId,
        channel:          input.channel ?? "pos",
        paymentMethod:    primaryPaymentMethod,
        paymentBreakdown: input.paymentBreakdown ?? null,
        saleNotes:        input.saleNotes,
        promoCodeId:      promoResolved?.id   ?? null,
        promoDiscount:    promoDiscount.toString(),
        createdAt:        new Date(),
        updatedAt:        new Date(),
      })
      .returning();

    // ── Incrementar uso del código promocional ──────────────────────────────
    if (promoResolved) {
      await incrementPromoCodeUsage(promoResolved.id, tx);
    }

    // ── Canje de nota de crédito ─────────────────────────────────────────────
    // Solo para pagos "por_devolucion" con creditNoteId provisto.
    // Atómico: dentro de la misma transacción → rollback si la nota no está activa.
    if (input.creditNoteId) {
      const [creditNoteRow] = await tx
        .select()
        .from(creditNotesTable)
        .where(eq(creditNotesTable.id, input.creditNoteId))
        .for("update")
        .limit(1);

      if (!creditNoteRow || creditNoteRow.status !== "active") {
        throw Object.assign(
          new Error("Nota de crédito inválida o ya utilizada"),
          { statusCode: 409 }
        );
      }

      await tx
        .update(creditNotesTable)
        .set({ status: "redeemed", redeemedSaleId: inserted!.id, redeemedAt: new Date() })
        .where(eq(creditNotesTable.id, input.creditNoteId));

      // Si el crédito supera el total de la venta → nota residual
      const creditAmount = Number(creditNoteRow.amount);
      if (creditAmount > itemsTotal) {
        const remaining = creditAmount - itemsTotal;
        const [residualRow] = await tx
          .insert(creditNotesTable)
          .values({
            code:               generateCreditNoteCode(),
            amount:             String(remaining),
            originCreditNoteId: input.creditNoteId,
            ...(creditNoteRow.customerName  !== null && creditNoteRow.customerName  && { customerName:  creditNoteRow.customerName  }),
            ...(creditNoteRow.customerDni   !== null && creditNoteRow.customerDni   && { customerDni:   creditNoteRow.customerDni   }),
            ...(creditNoteRow.posCustomerId !== null && creditNoteRow.posCustomerId && { posCustomerId: creditNoteRow.posCustomerId }),
            ...(creditNoteRow.userId        !== null && creditNoteRow.userId        && { userId:        creditNoteRow.userId        }),
            ...(creditNoteRow.reason        !== null && creditNoteRow.reason        && { reason:        creditNoteRow.reason        }),
          })
          .returning();
        residualCreditNote = mapCreditNoteRow(residualRow!);
      }
    }

    return inserted!;
  });

  return { sale: mapSaleRow(row), residualCreditNote };
}

// ─── createPendingSale ────────────────────────────────────────────────────────

/**
 * Crea una venta en estado `pending` para el flujo de MercadoPago.
 *
 * Misma auditoría anti-fraude que `createSale`: precios y shippingCost
 * calculados desde la BD y el servicio de envíos — jamás desde el cliente.
 *
 * Flujo MP:
 *   1. Esta función crea la venta `pending` y reserva inventario.
 *   2. El controller crea la Preference de MP con sale.id como external_reference.
 *   3. El webhook de MP llama a `updateSaleStatus(id, "completed")` al aprobarse.
 *   4. Si el pago no se confirma, `PUT /sales/:id/cancel` revierte el stock.
 */
export async function createPendingSale(input: SaleOrderInput): Promise<Sale> {
  const isPickup     = input.shippingMethod === "pickup";
  const shippingCost = isPickup ? 0 : await computeShippingCost(input.shippingCity ?? "");

  const promoResolved = input.promoCode
    ? await resolvePromoForSale(input.promoCode, input.paymentMethod ?? "")
    : null;
  const row = await db.transaction(async (tx) => {

    // 1 — Check customer ban (solo web) ──────────────────────────────────
    if (input.channel !== "pos") {
      const [user] = await tx
        .select({ isActive: usersTable.isActive })
        .from(usersTable)
        .where(eq(usersTable.email, input.customerEmail.toLowerCase()));
      if (user && !user.isActive) {
        throw Object.assign(
          new Error("Esta cuenta se encuentra suspendida."),
          { statusCode: 403 }
        );
      }
    }

    // 2 — Resolver precios reales desde la BD ─────────────────────────────
    const productIds = [...new Set(input.items.map((i) => i.productId))];

    const priceRows = await tx
      .select({ id: productsTable.id, price: productsTable.price })
      .from(productsTable)
      .where(inArray(productsTable.id, productIds));

    const priceMap = new Map(priceRows.map((r) => [r.id, Number(r.price)]));

    for (const item of input.items) {
      if (!priceMap.has(item.productId)) {
        throw Object.assign(
          new Error(`Producto no encontrado: ${item.productId}`),
          { statusCode: 404 }
        );
      }
    }

    // 3 — Deducir stock y construir SaleItems con precios verificados ──────
    const saleItems: SaleItem[] = [];

    // priceTier solo aplica en ventas POS (indicado por presencia de vendorId).
    const effectiveTier = input.vendorId ? input.priceTier : undefined;

    for (const item of input.items) {
      await deductStockItem(tx, item);

      const unitPrice = applyPriceTier(priceMap.get(item.productId)!, effectiveTier);

      saleItems.push({
        productId: item.productId,
        quantity:  item.quantity,
        unitPrice,
        subtotal:  unitPrice * item.quantity,
        size:      item.size,
      });
    }

    // 4 — Calcular totales en el servidor ────────────────────────────────
    // shippingCost resuelto antes de la transacción (ver arriba).

    const itemsTotal       = saleItems.reduce((sum, i) => sum + i.subtotal, 0);
    const transferDiscount = (!effectiveTier && input.paymentMethod === "transfer") ? itemsTotal * TRANSFER_DISCOUNT_RATE : 0;

    let promoDiscount = 0;
    if (promoResolved) {
      if (promoResolved.discountType === "percentage") {
        promoDiscount = itemsTotal * (promoResolved.discountValue / 100);
      } else {
        const base = itemsTotal - transferDiscount;
        promoDiscount = Math.min(promoResolved.discountValue, base);
      }
    }

    const total = itemsTotal - transferDiscount - promoDiscount + shippingCost;

    // 5 — Insertar venta pending ───────────────────────────────────────────
    const [inserted] = await tx
      .insert(salesTable)
      .values({
        items:            saleItems,
        total:            total.toString(),
        status:           "pending",
        customerName:     input.customerName,
        customerEmail:    input.customerEmail,
        customerPhone:    input.customerPhone,
        customerDni:      input.customerDni,
        shippingAddress:  input.shippingAddress  ?? "",
        shippingCity:     input.shippingCity     ?? "",
        shippingProvince: input.shippingProvince ?? "",
        shippingZipCode:  input.shippingZipCode  ?? "",
        shippingMethod:   input.shippingMethod   ?? "delivery",
        shippingCost:     shippingCost.toString(),
        userId:           input.userId,
        vendorId:         input.vendorId,
        channel:          input.channel ?? "web",
        paymentMethod:    input.paymentMethod,
        saleNotes:        input.saleNotes,
        promoCodeId:      promoResolved?.id   ?? null,
        promoDiscount:    promoDiscount.toString(),
        createdAt:        new Date(),
        updatedAt:        new Date(),
      })
      .returning();

    if (promoResolved) {
      await incrementPromoCodeUsage(promoResolved.id, tx);
    }

    return inserted!;
  });

  return mapSaleRow(row);
}

// ─── cancelSaleAndRestoreStock ────────────────────────────────────────────────

/**
 * Cancela una venta `pending` y restaura el stock descontado.
 *
 * Flujo atómico en una sola transacción:
 *   1. Verifica que la venta exista y esté en estado `pending`.
 *   2. Por cada SaleItem:
 *      - Si tiene `size` → incrementa la fila exacta (productId, size).
 *      - Si no tiene `size` → incrementa la fila centinela vacía del producto.
 *   3. Inserta movimientos de tipo "in" (cancelación) para trazabilidad.
 *   4. Actualiza el status de la venta a `cancelled`.
 *
 * Solo ventas `pending` pueden cancelarse; las `completed` ya liquidaron el pago.
 */
export async function cancelSaleAndRestoreStock(id: string): Promise<Sale> {
  const sale = await findSaleById(id);

  if (!sale) {
    throw Object.assign(new Error("Venta no encontrada"), { statusCode: 404 });
  }

  if (sale.status !== "pending") {
    throw Object.assign(
      new Error(`Solo se pueden cancelar ventas en estado pending. Estado actual: ${sale.status}`),
      { statusCode: 422 }
    );
  }

  const row = await db.transaction(async (tx) => {

    for (const item of sale.items) {
      if (item.productId === LIBRE_PRODUCT_ID) continue;

      const dbSize = item.size ?? "";

      await tx
        .insert(stockTable)
        .values({ productId: item.productId, size: dbSize, quantity: item.quantity })
        .onConflictDoUpdate({
          target: [stockTable.productId, stockTable.size],
          set: { quantity: sql`${stockTable.quantity} + ${item.quantity}`, updatedAt: new Date() },
        });

      await tx.insert(stockMovementsTable).values({
        productId: item.productId,
        size:      dbSize,
        type:      "in",
        quantity:  item.quantity,
        reason:    `cancelacion-venta-${id}`,
        createdAt: new Date(),
      });
    }

    // Devolver el uso del código promocional — evita que órdenes abandonadas
    // agoten códigos de uso limitado (ej. maxUses=1 + pago MP nunca completado).
    if (sale.promoCodeId) {
      await tx
        .update(promotionalCodesTable)
        .set({
          usedCount: sql`GREATEST(${promotionalCodesTable.usedCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(promotionalCodesTable.id, sale.promoCodeId));
    }

    const [updated] = await tx
      .update(salesTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(salesTable.id, id))
      .returning();

    return updated!;
  });

  return mapSaleRow(row);
}

// ─── dismissSale ──────────────────────────────────────────────────────────────

/**
 * Desestima una venta para excluirla del dashboard.
 * Opcionalmente restaura el inventario si la orden había consumido stock.
 */
export async function dismissSale(id: string, reason: string, restoreStock: boolean): Promise<Sale> {
  const sale = await findSaleById(id);

  if (!sale) {
    throw Object.assign(new Error("Venta no encontrada"), { statusCode: 404 });
  }

  if (sale.isDismissed) {
    throw Object.assign(new Error("La venta ya fue desestimada"), { statusCode: 422 });
  }

  const row = await db.transaction(async (tx) => {
    if (restoreStock) {
      for (const item of sale.items) {
        // Artículos libres (LIBRE_PRODUCT_ID) no tienen fila en productsTable
        // ni en stockTable — saltarlos evita FK violation en stockMovementsTable
        // que de otro modo hace rollback de toda la transacción.
        if (item.productId === LIBRE_PRODUCT_ID) continue;

        const dbSize = item.size ?? "";

        await tx
          .insert(stockTable)
          .values({ productId: item.productId, size: dbSize, quantity: item.quantity })
          .onConflictDoUpdate({
            target: [stockTable.productId, stockTable.size],
            set: { quantity: sql`${stockTable.quantity} + ${item.quantity}`, updatedAt: new Date() },
          });

        await tx.insert(stockMovementsTable).values({
          productId: item.productId,
          size:      dbSize,
          type:      "in",
          quantity:  item.quantity,
          reason:    `desestimacion-venta-${id}`,
          createdAt: new Date(),
        });
      }
    }

    const [updated] = await tx
      .update(salesTable)
      .set({ isDismissed: true, dismissReason: reason, updatedAt: new Date() })
      .where(eq(salesTable.id, id))
      .returning();

    return updated!;
  });

  return mapSaleRow(row);
}
