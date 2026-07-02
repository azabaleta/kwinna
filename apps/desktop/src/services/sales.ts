import { api } from "../lib/api";
import type { Sale, SaleStatus, CreditNote, SaleListResponse, SaleResponse, PriceTier, PaymentSplit } from "@kwinna/contracts";

export interface PosSalePayload {
  items:             Array<{ productId: string; quantity: number; size?: string }>;
  customItems?:      Array<{ description: string; unitPrice: number; quantity: number }>;
  customerName:      string;
  customerEmail:     string;
  customerPhone?:    string;
  customerDni?:      string;
  shippingAddress?:  string;
  shippingCity?:     string;
  shippingProvince?: string;
  channel:           "pos";
  paymentMethod?:    string;
  paymentBreakdown?: PaymentSplit[];
  priceTier?:        PriceTier;
  saleNotes?:        string;
  vendorId?:         string;
  userId?:           string;
  posCustomerId?:    string;
  creditNoteId?:     string;
}

export async function createPosSale(payload: PosSalePayload): Promise<{ sale: Sale; residualCreditNote?: CreditNote }> {
  const res = await api.post<SaleResponse>("/sales", payload);
  return { sale: res.data, residualCreditNote: res.residualCreditNote };
}

export async function fetchWebOrders(): Promise<Sale[]> {
  const res = await api.get<SaleListResponse>("/sales/web-orders");
  return res.data;
}

export async function updateOrderStatus(saleId: string, status: SaleStatus): Promise<Sale> {
  const res = await api.patch<SaleResponse>(`/sales/${saleId}/status`, { status });
  return res.data;
}
