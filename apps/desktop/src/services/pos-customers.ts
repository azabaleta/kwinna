import { api } from "../lib/api";
import type { CustomerSearchResponse, CustomerSearchResult, PosCustomerResponse, PosCustomer } from "@kwinna/contracts";

export async function searchCustomers(q: string): Promise<CustomerSearchResult[]> {
  if (!q || q.trim().length < 2) return [];
  const res = await api.get<CustomerSearchResponse>(`/pos-customers/search?q=${encodeURIComponent(q.trim())}`);
  return res.data;
}

export async function createPosCustomer(input: {
  name:     string;
  dni:      string;
  phone:    string;
  email?:   string;
  address?: string;
  city?:    string;
  province?: string;
}): Promise<PosCustomer> {
  const res = await api.post<PosCustomerResponse>("/pos-customers", input);
  return res.data;
}
