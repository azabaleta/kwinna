import { eq, sql } from "drizzle-orm";
import type { PromoCode } from "@kwinna/contracts";
import { db } from "../index";
import { promotionalCodesTable } from "../schema";

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function mapPromoCodeRow(row: typeof promotionalCodesTable.$inferSelect): PromoCode {
  return {
    id:          row.id,
    code:        row.code,
    description: row.description ?? null,

    transferDiscountType:  (row.transferDiscountType as PromoCode["transferDiscountType"]) ?? null,
    transferDiscountValue: row.transferDiscountValue !== null ? Number(row.transferDiscountValue) : null,

    cardDiscountType:  (row.cardDiscountType as PromoCode["cardDiscountType"]) ?? null,
    cardDiscountValue: row.cardDiscountValue !== null ? Number(row.cardDiscountValue) : null,

    isActive:   row.isActive,
    validFrom:  row.validFrom?.toISOString() ?? null,
    validUntil: row.validUntil?.toISOString() ?? null,
    maxUses:    row.maxUses   ?? null,
    usedCount:  row.usedCount,

    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findAllPromoCodes(): Promise<PromoCode[]> {
  const rows = await db
    .select()
    .from(promotionalCodesTable)
    .orderBy(promotionalCodesTable.createdAt);
  return rows.map(mapPromoCodeRow);
}

export async function findPromoCodeById(id: string): Promise<PromoCode | null> {
  const [row] = await db
    .select()
    .from(promotionalCodesTable)
    .where(eq(promotionalCodesTable.id, id))
    .limit(1);
  return row ? mapPromoCodeRow(row) : null;
}

export async function findPromoCodeByCode(code: string): Promise<PromoCode | null> {
  const [row] = await db
    .select()
    .from(promotionalCodesTable)
    .where(eq(promotionalCodesTable.code, code.toUpperCase()))
    .limit(1);
  return row ? mapPromoCodeRow(row) : null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function insertPromoCode(
  input: Omit<typeof promotionalCodesTable.$inferInsert, "id" | "usedCount" | "createdAt" | "updatedAt">
): Promise<PromoCode> {
  const [row] = await db
    .insert(promotionalCodesTable)
    .values({ ...input, usedCount: 0 })
    .returning();
  return mapPromoCodeRow(row!);
}

export async function updatePromoCode(
  id: string,
  input: Partial<Omit<typeof promotionalCodesTable.$inferInsert, "id" | "createdAt">>
): Promise<PromoCode | null> {
  const [row] = await db
    .update(promotionalCodesTable)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(promotionalCodesTable.id, id))
    .returning();
  return row ? mapPromoCodeRow(row) : null;
}

export async function deletePromoCodeById(id: string): Promise<boolean> {
  const result = await db
    .delete(promotionalCodesTable)
    .where(eq(promotionalCodesTable.id, id))
    .returning({ id: promotionalCodesTable.id });
  return result.length > 0;
}

export async function incrementPromoCodeUsage(
  id: string,
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
): Promise<void> {
  await tx
    .update(promotionalCodesTable)
    .set({ usedCount: sql`${promotionalCodesTable.usedCount} + 1`, updatedAt: new Date() })
    .where(eq(promotionalCodesTable.id, id));
}
