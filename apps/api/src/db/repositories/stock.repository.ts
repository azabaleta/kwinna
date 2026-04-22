import { and, eq, gte, lt } from "drizzle-orm";
import type { Stock, StockMovement } from "@kwinna/contracts";
import { db } from "../index";
import { stockMovementsTable, stockTable } from "../schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sizeToDb(size: string | undefined): string {
  return size ?? "";
}

function sizeFromDb(size: string): string | undefined {
  return size === "" ? undefined : size;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapStockRow(row: typeof stockTable.$inferSelect): Stock {
  return {
    id:        row.id,
    productId: row.productId,
    size:      sizeFromDb(row.size),
    quantity:  row.quantity,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapMovementRow(row: typeof stockMovementsTable.$inferSelect): StockMovement {
  return {
    id:        row.id,
    productId: row.productId,
    size:      sizeFromDb(row.size),
    type:      row.type,
    quantity:  row.quantity,
    reason:    row.reason ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findAllStock(): Promise<Stock[]> {
  const rows = await db.select().from(stockTable);
  return rows.map(mapStockRow);
}

export async function findStockByProductId(productId: string): Promise<Stock[]> {
  const rows = await db
    .select()
    .from(stockTable)
    .where(eq(stockTable.productId, productId));
  return rows.map(mapStockRow);
}

/**
 * Movimientos de stock tipo "in" (ingresos de mercadería) en un rango de fechas.
 * Usado para calcular el Sell-Through Rate por variante en el dashboard.
 */
export async function findStockMovementsInRange(from: Date, to: Date): Promise<StockMovement[]> {
  const rows = await db
    .select()
    .from(stockMovementsTable)
    .where(
      and(
        eq(stockMovementsTable.type, "in"),
        gte(stockMovementsTable.createdAt, from),
        lt(stockMovementsTable.createdAt, to),
      ),
    )
    .orderBy(stockMovementsTable.createdAt);
  return rows.map(mapMovementRow);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface AddStockInput {
  productId: string;
  quantity:  number;
  size?:     string;
  reason?:   string;
}

/**
 * Hace upsert de stock para (productId, size) y registra el movimiento con talle.
 */
export async function addStock(input: AddStockInput): Promise<StockMovement> {
  const dbSize = sizeToDb(input.size);

  const existing = await db
    .select()
    .from(stockTable)
    .where(
      and(
        eq(stockTable.productId, input.productId),
        eq(stockTable.size, dbSize),
      ),
    );

  if (existing[0]) {
    await db
      .update(stockTable)
      .set({ quantity: existing[0].quantity + input.quantity, updatedAt: new Date() })
      .where(
        and(
          eq(stockTable.productId, input.productId),
          eq(stockTable.size, dbSize),
        ),
      );
  } else {
    await db.insert(stockTable).values({
      productId: input.productId,
      size:      dbSize,
      quantity:  input.quantity,
      updatedAt: new Date(),
    });
  }

  const [movement] = await db
    .insert(stockMovementsTable)
    .values({
      productId: input.productId,
      size:      dbSize,          // ← talle guardado en el movimiento
      type:      "in",
      quantity:  input.quantity,
      reason:    input.reason,
      createdAt: new Date(),
    })
    .returning();

  return mapMovementRow(movement!);
}
