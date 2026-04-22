import {
  StockListResponseSchema,
  StockMovementListResponseSchema,
  StockMovementResponseSchema,
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

/**
 * GET /stock/:productId — retorna todas las variantes de talle del producto.
 */
export async function fetchProductStock(
  productId: Stock["productId"]
): Promise<Stock[]> {
  const res = await apiClient.get(`/stock/${productId}`);
  return StockListResponseSchema.parse(res.data).data;
}

export interface StockInPayload {
  productId: StockMovement["productId"];
  quantity:  StockMovement["quantity"];
  size?:     string;
  reason?:   StockMovement["reason"];
}

export async function postStockIn(
  payload: StockInPayload
): Promise<StockMovementResponse> {
  const res = await apiClient.post("/stock/in", payload);
  return StockMovementResponseSchema.parse(res.data);
}

/**
 * GET /stock/movements?from=ISO&to=ISO
 * Devuelve todos los ingresos ("in") de mercadería en el rango.
 * Solo accesible por admin/operator.
 */
export async function fetchStockMovements(from: Date, to: Date): Promise<StockMovement[]> {
  const res = await apiClient.get("/stock/movements", {
    params: { from: from.toISOString(), to: to.toISOString() },
  });
  return StockMovementListResponseSchema.parse(res.data).data;
}
