import { api } from "../lib/api";
import type { Stock, StockListResponse } from "@kwinna/contracts";

export async function fetchStockByProduct(productId: string): Promise<Stock[]> {
  const res = await api.get<StockListResponse>(`/stock?productId=${productId}`);
  return res.data;
}

export async function fetchAllStock(): Promise<Stock[]> {
  const res = await api.get<StockListResponse>("/stock");
  return res.data;
}
