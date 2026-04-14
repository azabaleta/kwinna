import { eq } from "drizzle-orm";
import type { Sale } from "@kwinna/contracts";
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

    // Shipping
    shippingAddress:  row.shippingAddress,
    shippingCity:     row.shippingCity,
    shippingProvince: row.shippingProvince,
    shippingCost:     Number(row.shippingCost),

    userId: row.userId ?? undefined,

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
 * Usado por el webhook de MP para marcar `pending → completed`.
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
