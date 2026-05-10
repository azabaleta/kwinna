import { eq } from "drizzle-orm";
import { db } from "../db";
import { stockBalancesTable, stockBalanceItemsTable } from "../db/schema";
import type { StockBalance, StockBalanceCreateSchema, StockBalanceUpdateSchema } from "@kwinna/contracts";

// Mappers

function mapToContract(row: any, items: any[] = []): StockBalance {
  return {
    id: row.id,
    status: row.status,
    notes: row.notes,
    createdBy: row.createdBy,
    totalLosses: row.totalLosses ? parseFloat(row.totalLosses) : null,
    totalDiscrepancies: row.totalDiscrepancies,
    accuracyPercentage: row.accuracyPercentage ? parseFloat(row.accuracyPercentage) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    items: items.map(item => ({
      id: item.id,
      balanceId: item.balanceId,
      productId: item.productId,
      size: item.size === "" ? undefined : item.size,
      expectedQuantity: item.expectedQuantity,
      countedQuantity: item.countedQuantity,
      unitPrice: item.unitPrice ? parseFloat(item.unitPrice) : null,
    })),
  };
}

export async function createStockBalance(userId: string, data: any): Promise<StockBalance> {
  const [balance] = await db
    .insert(stockBalancesTable)
    .values({
      createdBy: userId,
      notes: data.notes,
    })
    .returning();

  return mapToContract(balance);
}

export async function getStockBalance(id: string): Promise<StockBalance | null> {
  const [balance] = await db
    .select()
    .from(stockBalancesTable)
    .where(eq(stockBalancesTable.id, id));

  if (!balance) return null;

  const items = await db
    .select()
    .from(stockBalanceItemsTable)
    .where(eq(stockBalanceItemsTable.balanceId, id));

  return mapToContract(balance, items);
}

export async function listStockBalances(): Promise<StockBalance[]> {
  const balances = await db
    .select()
    .from(stockBalancesTable)
    .orderBy(stockBalancesTable.createdAt);

  return balances.map(b => mapToContract(b)).reverse();
}

export async function updateStockBalanceDraft(id: string, items: any[]): Promise<void> {
  await db.transaction(async (tx) => {
    // Clear old items for this draft
    await tx.delete(stockBalanceItemsTable).where(eq(stockBalanceItemsTable.balanceId, id));

    if (items.length > 0) {
      const newItems = items.map(item => ({
        balanceId: id,
        productId: item.productId,
        size: item.size ?? "",
        countedQuantity: item.countedQuantity ?? item.quantity,
      }));
      await tx.insert(stockBalanceItemsTable).values(newItems);
    }

    await tx.update(stockBalancesTable)
      .set({ updatedAt: new Date() })
      .where(eq(stockBalancesTable.id, id));
  });
}

export async function cancelStockBalance(id: string): Promise<StockBalance | null> {
  const [balance] = await db
    .select()
    .from(stockBalancesTable)
    .where(eq(stockBalancesTable.id, id));

  if (!balance || balance.status !== "in_progress") return null;

  const [updated] = await db
    .update(stockBalancesTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(stockBalancesTable.id, id))
    .returning();

  return mapToContract(updated!);
}
