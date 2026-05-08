import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { PaymentMethod, Sale } from "@kwinna/contracts";
import { db } from "../index";
import { salesTable } from "../schema";

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function mapSaleRow(row: typeof salesTable.$inferSelect): Sale {
  return {
    id:     row.id,
    items:  row.items,
    total:  Number(row.total),
    status: row.status,

    // Customer PII
    customerName:  row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone ?? undefined,
    customerDni:   row.customerDni   ?? undefined,

    // Shipping
    shippingAddress:  row.shippingAddress,
    shippingCity:     row.shippingCity,
    shippingProvince: row.shippingProvince,
    shippingZipCode:  row.shippingZipCode,
    shippingMethod:   (row.shippingMethod ?? "delivery") as "delivery" | "pickup",
    shippingCost:     Number(row.shippingCost),

    // Channel + POS metadata
    channel:       row.channel,
    paymentMethod: (row.paymentMethod as PaymentMethod) ?? undefined,
    saleNotes:     row.saleNotes     ?? undefined,

    userId:        row.userId        ?? undefined,
    posCustomerId: row.posCustomerId ?? undefined,
    vendorId:      row.vendorId      ?? undefined,

    isDismissed:   row.isDismissed,
    dismissReason: row.dismissReason ?? undefined,

    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Lista todas las ventas ordenadas por fecha descendente.
 * SOLO invocar desde endpoints protegidos (admin/operator) — contiene PII.
 */
export async function findAllSales(): Promise<Sale[]> {
  const rows = await db
    .select()
    .from(salesTable)
    .orderBy(salesTable.createdAt);
  return rows.map(mapSaleRow);
}

/**
 * Busca una venta por UUID.
 * Devuelve undefined si no existe.
 */
export async function findSaleById(id: string): Promise<Sale | undefined> {
  const [row] = await db
    .select()
    .from(salesTable)
    .where(eq(salesTable.id, id));
  return row ? mapSaleRow(row) : undefined;
}

/**
 * Actualiza el status de una venta.
 * Usado por el webhook de MP para marcar `pending → completed`
 * y por el POS para marcar `completed → assembled`.
 */
export async function updateSaleStatus(
  id:     string,
  status: Sale["status"]
): Promise<Sale | undefined> {
  const [row] = await db
    .update(salesTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(salesTable.id, id))
    .returning();
  return row ? mapSaleRow(row) : undefined;
}

/**
 * Devuelve pedidos web que el POS debe procesar.
 * Filtra: channel = 'web' AND status IN ('completed', 'assembled').
 * Ordenados por createdAt ascendente (los más antiguos primero).
 */
export async function findWebOrdersToProcess(): Promise<Sale[]> {
  const rows = await db
    .select()
    .from(salesTable)
    .where(
      and(
        eq(salesTable.channel, "web"),
        inArray(salesTable.status, ["completed", "assembled"])
      )
    )
    .orderBy(salesTable.createdAt);
  return rows.map(mapSaleRow);
}

/**
 * Busca todas las ventas pendientes asociadas a un email (o userId).
 */
export async function findPendingSalesByEmail(email: string): Promise<Sale[]> {
  const rows = await db
    .select()
    .from(salesTable)
    .where(
      and(
        eq(salesTable.customerEmail, email),
        eq(salesTable.status, "pending")
      )
    );
  return rows.map(mapSaleRow);
}

/**
 * Busca una venta por su código de transacción del ticket (primeros 10 chars del UUID sin guiones).
 * El código en los tickets se genera como: sale.id.replace(/-/g,"").slice(0,10).toUpperCase()
 * Devuelve la más reciente si hubiera colisión (probabilidad ~0 con UUIDs v4).
 */
export async function findSaleByTxCode(txCode: string): Promise<Sale | undefined> {
  const normalized = txCode.toLowerCase();
  const rows = await db
    .select()
    .from(salesTable)
    .where(sql`left(replace(${salesTable.id}::text, '-', ''), 10) = ${normalized}`)
    .orderBy(desc(salesTable.createdAt))
    .limit(1);
  return rows[0] ? mapSaleRow(rows[0]) : undefined;
}
