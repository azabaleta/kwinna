import { api } from "../lib/api";
import type {
  Return,
  CreditNote,
  ReturnCreateInput,
  ReturnWithCreditNoteResponse,
  ReturnBatchCreateInput,
  ReturnBatchWithCreditNoteResponse,
  Sale,
} from "@kwinna/contracts";

export async function createReturn(input: ReturnCreateInput): Promise<{ returnData: Return; creditNote: CreditNote }> {
  const res = await api.post<ReturnWithCreditNoteResponse>("/returns", input);
  return { returnData: res.data, creditNote: res.creditNote };
}

export async function createReturnBatch(
  input: ReturnBatchCreateInput,
): Promise<{ returns: Return[]; creditNote: CreditNote }> {
  const res = await api.post<ReturnBatchWithCreditNoteResponse>("/returns/batch", input);
  return { returns: res.data, creditNote: res.creditNote };
}

export async function lookupSaleByCode(txCode: string): Promise<Sale> {
  const res = await api.get<{ data: Sale }>(`/sales/by-code/${encodeURIComponent(txCode.toUpperCase())}`);
  return res.data;
}
