import {
  StockListResponseSchema,
  StockMovementResponseSchema,
  StockResponseSchema,
  type Stock,
  type StockListResponse,
  type StockMovement,
  type StockMovementResponse,
} from "@kwinna/contracts";
import apiClient from "@/lib/axios";

export async function fetchStock(): Promise<StockListResponse> {
  const res = await apiClient.get("/stock");
  return StockListResponseSchema.parse(res.data);
}

export async function fetchProductStock(productId: Stock["productId"]): Promise<Stock> {
  const res = await apiClient.get(`/stock/${productId}`);
  return StockResponseSchema.parse(res.data).data;
}

export interface StockInPayload {
  productId: StockMovement["productId"];
  quantity: StockMovement["quantity"];
  reason?: StockMovement["reason"];
}

export async function postStockIn(payload: StockInPayload): Promise<StockMovementResponse> {
  const res = await apiClient.post("/stock/in", payload);
  return StockMovementResponseSchema.parse(res.data);
}
