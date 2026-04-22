import { and, gte, lt } from "drizzle-orm";
import type { Return, ReturnReason } from "@kwinna/contracts";
import { db } from "../index";
import { returnsTable } from "../schema";

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapReturnRow(row: typeof returnsTable.$inferSelect): Return {
  return {
    id:        row.id,
    saleId:    row.saleId    ?? undefined,
    productId: row.productId,
    size:      row.size === "" ? undefined : row.size,
    quantity:  row.quantity,
    reason:    row.reason as ReturnReason,
    notes:     row.notes    ?? undefined,
    restocked: row.restocked === 1,
    unitPrice: Number(row.unitPrice),
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findAllReturns(): Promise<Return[]> {
  const rows = await db
    .select()
    .from(returnsTable)
    .orderBy(returnsTable.createdAt);
  return rows.map(mapReturnRow);
}

export async function findReturnsByDateRange(from: Date, to: Date): Promise<Return[]> {
  const rows = await db
    .select()
    .from(returnsTable)
    .where(
      and(
        gte(returnsTable.createdAt, from),
        lt(returnsTable.createdAt, to),
      ),
    )
    .orderBy(returnsTable.createdAt);
  return rows.map(mapReturnRow);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface InsertReturnInput {
  saleId?:    string;
  productId:  string;
  size?:      string;
  quantity:   number;
  reason:     ReturnReason;
  notes?:     string;
  restocked:  boolean;
  unitPrice:  number;
}

export async function insertReturn(input: InsertReturnInput): Promise<Return> {
  const [row] = await db
    .insert(returnsTable)
    .values({
      saleId:    input.saleId,
      productId: input.productId,
      size:      input.size ?? "",
      quantity:  input.quantity,
      reason:    input.reason,
      notes:     input.notes,
      restocked: input.restocked ? 1 : 0,
      unitPrice: String(input.unitPrice),
    })
    .returning();
  return mapReturnRow(row!);
}
