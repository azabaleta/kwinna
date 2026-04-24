import { and, eq, inArray, sql } from "drizzle-orm";
import type { Sale, SaleItem, SaleOrderInput } from "@kwinna/contracts";
import { db } from "../db";
import { mapSaleRow } from "../db/repositories";
import { findSaleById } from "../db/repositories/sale.repository";
import { productsTable, salesTable, stockMovementsTable, stockTable } from "../db/schema";
import { computeShippingCost } from "./shipping.service";

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
export async function createSale(input: SaleOrderInput): Promise<Sale> {
  const row = await db.transaction(async (tx) => {

    // 1 — Resolver precios reales desde la BD ─────────────────────────────
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

    // 2 — Deducir stock y construir SaleItems con precios verificados ──────
    const saleItems: SaleItem[] = [];

    for (const item of input.items) {
      await deductStockItem(tx, item);

      const unitPrice = priceMap.get(item.productId)!;
      saleItems.push({
        productId: item.productId,
        quantity:  item.quantity,
        unitPrice,
        subtotal:  unitPrice * item.quantity,
        size:      item.size,
      });
    }

    // 3 — Calcular totales en el servidor ─────────────────────────────────
    // Pickup siempre tiene envío gratis, independientemente de la ciudad.
    const isPickup    = input.shippingMethod === "pickup";
    const shippingCost = isPickup ? 0 : computeShippingCost(input.shippingCity);
    const total = saleItems.reduce((sum, i) => sum + i.subtotal, 0) + shippingCost;

    // 4 — Insertar venta ───────────────────────────────────────────────────
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
        shippingAddress:  input.shippingAddress,
        shippingCity:     input.shippingCity,
        shippingProvince: input.shippingProvince,
        shippingZipCode:  input.shippingZipCode ?? "",
        shippingMethod:   input.shippingMethod ?? "delivery",
        shippingCost:     shippingCost.toString(),
        userId:           input.userId,
        channel:          input.channel ?? "pos",
        paymentMethod:    input.paymentMethod,
        saleNotes:        input.saleNotes,
        createdAt:        new Date(),
        updatedAt:        new Date(),
      })
      .returning();

    return inserted!;
  });

  return mapSaleRow(row);
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
  const row = await db.transaction(async (tx) => {

    // 1 — Resolver precios reales desde la BD ─────────────────────────────
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

    // 2 — Deducir stock y construir SaleItems con precios verificados ──────
    const saleItems: SaleItem[] = [];

    for (const item of input.items) {
      await deductStockItem(tx, item);

      const unitPrice = priceMap.get(item.productId)!;
      saleItems.push({
        productId: item.productId,
        quantity:  item.quantity,
        unitPrice,
        subtotal:  unitPrice * item.quantity,
        size:      item.size,
      });
    }

    // 3 — Calcular totales en el servidor ─────────────────────────────────
    // Pickup siempre tiene envío gratis, independientemente de la ciudad.
    const isPickup     = input.shippingMethod === "pickup";
    const shippingCost = isPickup ? 0 : computeShippingCost(input.shippingCity);
    const total = saleItems.reduce((sum, i) => sum + i.subtotal, 0) + shippingCost;

    // 4 — Insertar venta pending ───────────────────────────────────────────
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
        shippingAddress:  input.shippingAddress,
        shippingCity:     input.shippingCity,
        shippingProvince: input.shippingProvince,
        shippingZipCode:  input.shippingZipCode ?? "",
        shippingMethod:   input.shippingMethod ?? "delivery",
        shippingCost:     shippingCost.toString(),
        userId:           input.userId,
        channel:          input.channel ?? "web",
        paymentMethod:    input.paymentMethod,
        saleNotes:        input.saleNotes,
        createdAt:        new Date(),
        updatedAt:        new Date(),
      })
      .returning();

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

      if (item.size) {
        const [stockRow] = await tx
          .select()
          .from(stockTable)
          .where(and(
            eq(stockTable.productId, item.productId),
            eq(stockTable.size, item.size),
          ))
          .for("update");

        if (stockRow) {
          await tx
            .update(stockTable)
            .set({ quantity: sql`${stockTable.quantity} + ${item.quantity}`, updatedAt: new Date() })
            .where(eq(stockTable.id, stockRow.id));
        }

      } else {
        const [stockRow] = await tx
          .select()
          .from(stockTable)
          .where(and(
            eq(stockTable.productId, item.productId),
            eq(stockTable.size, ""),
          ))
          .for("update");

        if (stockRow) {
          await tx
            .update(stockTable)
            .set({ quantity: sql`${stockTable.quantity} + ${item.quantity}`, updatedAt: new Date() })
            .where(eq(stockTable.id, stockRow.id));
        }
      }

      await tx.insert(stockMovementsTable).values({
        productId: item.productId,
        type:      "in",
        quantity:  item.quantity,
        reason:    `cancelacion-venta-${id}`,
        createdAt: new Date(),
      });
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
