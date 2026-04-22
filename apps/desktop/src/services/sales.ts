import { api } from "../lib/api";
import type { Sale, SaleListResponse, SaleResponse } from "@kwinna/contracts";

export interface PosSalePayload {
  items:            Array<{ productId: string; quantity: number; size?: string }>;
  customerName:     string;
  customerEmail:    string;
  customerPhone?:   string;
  customerDni?:     string;
  shippingAddress:  string;
  shippingCity:     string;
  shippingProvince: string;
  channel:          "pos";
  paymentMethod?:   string;
  saleNotes?:       string;
}

export async function createPosSale(payload: PosSalePayload): Promise<Sale> {
  const res = await api.post<SaleResponse>("/sales", payload);
  return res.data;
}

export async function fetchWebOrders(): Promise<Sale[]> {
  const res = await api.get<SaleListResponse>("/sales/web-orders");
  return res.data;
}

export async function markAsAssembled(saleId: string): Promise<Sale> {
  const res = await api.patch<SaleResponse>(`/sales/${saleId}/status`, { status: "assembled" });
  return res.data;
}
