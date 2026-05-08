import { CreditNoteResponseSchema, type CreditNote, type CreditNoteResponse } from "@kwinna/contracts";
import {
  CustomerSearchResponseSchema,
  PosCustomerCreateInputSchema,
  PosCustomerResponseSchema,
  type CustomerSearchResult,
  type PosCustomer,
  type PosCustomerCreateInput,
} from "@kwinna/contracts";
import apiClient from "@/lib/axios";

/** GET /pos-customers/search?q= — busca clientes web + POS por nombre/DNI. */
export async function searchCustomers(q: string): Promise<CustomerSearchResult[]> {
  const res = await apiClient.get("/pos-customers/search", { params: { q } });
  return CustomerSearchResponseSchema.parse(res.data).data;
}

/** POST /pos-customers — registra nuevo cliente POS. */
export async function createPosCustomer(input: PosCustomerCreateInput): Promise<PosCustomer> {
  const validated = PosCustomerCreateInputSchema.parse(input);
  const res = await apiClient.post("/pos-customers", validated);
  return PosCustomerResponseSchema.parse(res.data).data;
}

/** GET /credit-notes/:code — obtiene nota de crédito por código (ej: NC-A3X7K). */
export async function fetchCreditNoteByCode(code: string): Promise<CreditNote> {
  const res = await apiClient.get(`/credit-notes/${encodeURIComponent(code.trim().toUpperCase())}`);
  return CreditNoteResponseSchema.parse(res.data).data;
}
