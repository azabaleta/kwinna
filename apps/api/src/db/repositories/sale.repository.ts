import { and, desc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
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

    promoCodeId:   row.promoCodeId   ?? undefined,
    promoDiscount: Number(row.promoDiscount ?? 0),

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
 * Incluye:
 *   - Para armar (completed) y Armados (assembled): siempre.
 *   - Entregados (delivered): solo los de los últimos 7 días, para consulta
 *     reciente; luego desaparecen de la cola automáticamente.
 * Ordenados por createdAt ascendente (los más antiguos primero).
 */
export async function findWebOrdersToProcess(): Promise<Sale[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select()
    .from(salesTable)
    .where(
      and(
        eq(salesTable.channel, "web"),
        or(
          inArray(salesTable.status, ["completed", "assembled"]),
          and(
            eq(salesTable.status, "delivered"),
            gte(salesTable.updatedAt, sevenDaysAgo)
          )
        )
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
 * Devuelve las ventas que llevan más de `thresholdMinutes` en estado `pending`
 * y que todavía NO fueron alertadas (`staleAlertSentAt IS NULL`).
 * Excluye ventas desestimadas. Usado por el job de alertas de pendientes.
 */
export async function findStalePendingSales(thresholdMinutes: number): Promise<Sale[]> {
  const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000);

  const rows = await db
    .select()
    .from(salesTable)
    .where(
      and(
        eq(salesTable.status, "pending"),
        eq(salesTable.isDismissed, false),
        lt(salesTable.createdAt, cutoff),
        isNull(salesTable.staleAlertSentAt)
      )
    )
    .orderBy(salesTable.createdAt);
  return rows.map(mapSaleRow);
}

/**
 * Marca una venta como ya alertada por estar estancada en pending.
 * Idempotencia del job: evita re-notificar en cada corrida.
 */
export async function markStaleAlertSent(id: string): Promise<void> {
  await db
    .update(salesTable)
    .set({ staleAlertSentAt: new Date() })
    .where(eq(salesTable.id, id));
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
