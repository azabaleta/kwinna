import {
  SaleCheckoutResponseSchema,
  SaleListResponseSchema,
  SaleResponseSchema,
  type SaleCheckoutResponse,
  type SaleListResponse,
  type SaleOrderInput,
  type SaleResponse,
} from "@kwinna/contracts";
import apiClient from "@/lib/axios";

// Re-exportamos el tipo del contrato para que hooks y páginas lo importen aquí.
export type { SaleOrderInput };

/** POST /sales — venta directa POS (completed inmediato). */
export async function postSale(payload: SaleOrderInput): Promise<SaleResponse> {
  const res = await apiClient.post("/sales", payload);
  return SaleResponseSchema.parse(res.data);
}

/**
 * POST /sales/checkout — Checkout Pro con MercadoPago.
 * Devuelve { sale, initPoint } donde initPoint es la URL de pago de MP.
 */
export async function postCheckout(
  payload: SaleOrderInput
): Promise<SaleCheckoutResponse> {
  const res = await apiClient.post("/sales/checkout", payload);
  return SaleCheckoutResponseSchema.parse(res.data);
}

/** GET /sales — lista todas las ventas (solo admin/operator). */
export async function fetchSales(): Promise<SaleListResponse> {
  const res = await apiClient.get("/sales");
  return SaleListResponseSchema.parse(res.data);
}

/** PUT /sales/:id/cancel — cancela venta pending y restaura stock. */
export async function putCancelSale(id: string): Promise<SaleResponse> {
  const res = await apiClient.put(`/sales/${id}/cancel`);
  return SaleResponseSchema.parse(res.data);
}
