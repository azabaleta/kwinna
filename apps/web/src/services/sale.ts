import {
  SaleCheckoutResponseSchema,
  SaleListResponseSchema,
  SaleResponseSchema,
  SaleSchema,
  type Sale,
  type SaleCheckoutResponse,
  type SaleListResponse,
  type SaleOrderInput,
  type SaleResponse,
  type SaleDismissInput,
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

/** GET /sales/:id — obtiene el detalle de una venta por su ID. */
export async function fetchSaleById(id: string): Promise<SaleResponse> {
  const res = await apiClient.get(`/sales/${id}`);
  return SaleResponseSchema.parse(res.data);
}

/** PUT /sales/:id/cancel — cancela venta pending y restaura stock. */
export async function putCancelSale(id: string): Promise<SaleResponse> {
  const res = await apiClient.put(`/sales/${id}/cancel`);
  return SaleResponseSchema.parse(res.data);
}

/** PATCH /sales/:id/dismiss — desestima una venta (ej. orden de test). */
export async function patchDismissSale(
  id: string,
  payload: SaleDismissInput
): Promise<SaleResponse> {
  const res = await apiClient.patch(`/sales/${id}/dismiss`, payload);
  return SaleResponseSchema.parse(res.data);
}

/** PATCH /sales/:id/status — cambia el estado de una venta (ej. completed → assembled). */
export async function patchSaleStatus(
  id: string,
  status: string
): Promise<SaleResponse> {
  const res = await apiClient.patch(`/sales/${id}/status`, { status });
  return SaleResponseSchema.parse(res.data);
}

/** POST /sales/:id/reconcile — verifica pago en MP y actualiza la orden si está paga. */
export async function postReconcileSale(id: string): Promise<SaleResponse> {
  const res = await apiClient.post(`/sales/${id}/reconcile`);
  return SaleResponseSchema.parse(res.data);
}

/** POST /sales/:id/approve-transfer — aprueba manualmente una transferencia. */
export async function postApproveTransfer(id: string): Promise<SaleResponse> {
  const res = await apiClient.post(`/sales/${id}/approve-transfer`);
  return SaleResponseSchema.parse(res.data);
}

/** GET /sales/by-code/:txCode — busca venta por código corto del ticket (para devoluciones). */
export async function fetchSaleByCode(txCode: string): Promise<Sale> {
  const res = await apiClient.get(`/sales/by-code/${encodeURIComponent(txCode.toUpperCase())}`);
  return SaleSchema.parse(res.data.data);
}

export type { Sale };
