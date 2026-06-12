import {
  PromoCodeListResponseSchema,
  PromoCodeResponseSchema,
  PromoCodeValidateResponseSchema,
  type PromoCode,
  type PromoCodeCreateInput,
  type PromoCodeUpdateInput,
  type PromoCodeValidateResponse,
} from "@kwinna/contracts";
import apiClient from "@/lib/axios";

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function fetchPromoCodes(): Promise<PromoCode[]> {
  const res = await apiClient.get("/promo-codes");
  return PromoCodeListResponseSchema.parse(res.data).data;
}

export async function postPromoCode(payload: PromoCodeCreateInput): Promise<PromoCode> {
  const res = await apiClient.post("/promo-codes", payload);
  return PromoCodeResponseSchema.parse(res.data).data;
}

export async function patchPromoCode(id: string, payload: PromoCodeUpdateInput): Promise<PromoCode> {
  const res = await apiClient.patch(`/promo-codes/${id}`, payload);
  return PromoCodeResponseSchema.parse(res.data).data;
}

export async function deletePromoCode(id: string): Promise<void> {
  await apiClient.delete(`/promo-codes/${id}`);
}

// ─── Public ───────────────────────────────────────────────────────────────────

export async function validatePromoCode(
  code: string,
  paymentMethod: "mercadopago" | "transfer"
): Promise<PromoCodeValidateResponse> {
  const res = await apiClient.post("/promo-codes/validate", { code, paymentMethod });
  return PromoCodeValidateResponseSchema.parse(res.data);
}
