import {
  PromoStripResponseSchema,
  type PromoStrip,
  type PromoStripUpdateInput,
} from "@kwinna/contracts";
import apiClient from "@/lib/axios";

export async function fetchPromoStrip(): Promise<PromoStrip> {
  const res = await apiClient.get("/promo-strip");
  return PromoStripResponseSchema.parse(res.data).data;
}

export async function putPromoStrip(payload: PromoStripUpdateInput): Promise<PromoStrip> {
  const res = await apiClient.put("/promo-strip", payload);
  return PromoStripResponseSchema.parse(res.data).data;
}
