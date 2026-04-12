import {
  SaleResponseSchema,
  type Sale,
  type SaleResponse,
} from "@kwinna/contracts";
import apiClient from "@/lib/axios";

export interface CreateSalePayload {
  items: Sale["items"];
}

export async function postSale(payload: CreateSalePayload): Promise<SaleResponse> {
  const res = await apiClient.post("/sales", payload);
  return SaleResponseSchema.parse(res.data);
}
