import { api } from "../lib/api";
import type { Return, CreditNote, ReturnCreateInput, ReturnWithCreditNoteResponse } from "@kwinna/contracts";

export async function createReturn(input: ReturnCreateInput): Promise<{ returnData: Return; creditNote: CreditNote }> {
  const res = await api.post<ReturnWithCreditNoteResponse>("/returns", input);
  return { returnData: res.data, creditNote: res.creditNote };
}
