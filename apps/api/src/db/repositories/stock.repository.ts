import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
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

/**
 * Todos los movimientos de stock en un rango de fechas.
 * Filtrado opcional por productId para aislar la historia de un único ítem.
 */
export async function findAllStockMovements(from: Date, to: Date, productId?: string): Promise<StockMovement[]> {
  const conditions = [
    gte(stockMovementsTable.createdAt, from),
    lt(stockMovementsTable.createdAt, to),
  ];

  if (productId) {
    conditions.push(eq(stockMovementsTable.productId, productId));
  }

  const rows = await db
    .select()
    .from(stockMovementsTable)
    .where(and(...conditions))
    .orderBy(desc(stockMovementsTable.createdAt));
    
  return rows.map(mapMovementRow);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface AddStockInput {
  productId: string;
  quantity:  number;
  size?:     string;
  reason?:   string;
}

export interface RemoveStockInput {
  productId: string;
  quantity:  number;
  size?:     string;
  reason:    string;
}

/**
 * Hace upsert de stock para (productId, size) y registra el movimiento con talle.
 */
export async function addStock(input: AddStockInput): Promise<StockMovement> {
  const dbSize = sizeToDb(input.size);

  // Upsert atómico: evita la race condition TOCTOU (SELECT → UPDATE).
  // El unique index en (productId, size) garantiza que ON CONFLICT es determinista.
  await db
    .insert(stockTable)
    .values({ productId: input.productId, size: dbSize, quantity: input.quantity, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [stockTable.productId, stockTable.size],
      set: {
        quantity:  sql`${stockTable.quantity} + ${input.quantity}`,
        updatedAt: new Date(),
      },
    });

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

/**
 * Resta stock para (productId, size) y registra el movimiento de ajuste negativo.
 * Arroja error 409 si no hay stock suficiente.
 */
export async function removeStock(input: RemoveStockInput): Promise<StockMovement> {
  const dbSize = sizeToDb(input.size);

  const row = await db.transaction(async (tx) => {
    const [stockRow] = await tx
      .select()
      .from(stockTable)
      .where(and(
        eq(stockTable.productId, input.productId),
        eq(stockTable.size, dbSize),
      ))
      .for("update");

    if (!stockRow || stockRow.quantity < input.quantity) {
      throw Object.assign(
        new Error(`Stock insuficiente para descontar. Hay ${stockRow?.quantity ?? 0} unidades disponibles.`),
        { statusCode: 409 }
      );
    }

    await tx
      .update(stockTable)
      .set({ quantity: sql`${stockTable.quantity} - ${input.quantity}`, updatedAt: new Date() })
      .where(eq(stockTable.id, stockRow.id));

    const [movement] = await tx
      .insert(stockMovementsTable)
      .values({
        productId: input.productId,
        size:      dbSize,
        type:      "adjustment",
        quantity:  input.quantity, // quantity is positive, type 'adjustment' combined with stock subtraction defines the action
        reason:    input.reason,
        createdAt: new Date(),
      })
      .returning();

    return movement!;
  });

  return mapMovementRow(row);
}
