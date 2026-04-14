import type { Stock, StockMovement } from "@kwinna/contracts";
import {
  addStock as repoAddStock,
  findAllStock,
  findStockByProductId,
  type AddStockInput,
} from "../db/repositories";

export async function getAllStock(): Promise<Stock[]> {
  return findAllStock();
}

/**
 * Retorna todas las variantes de stock para un producto (una por talle).
 */
export async function getStockByProductId(productId: string): Promise<Stock[]> {
  return findStockByProductId(productId);
}

export type { AddStockInput as StockInInput };

export async function addStock(input: AddStockInput): Promise<StockMovement> {
  return repoAddStock(input);
}
