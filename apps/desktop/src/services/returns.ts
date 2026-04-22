import { api } from "../lib/api";
import type { Return, ReturnCreateInput, ReturnResponse } from "@kwinna/contracts";

export async function createReturn(input: ReturnCreateInput): Promise<Return> {
  const res = await api.post<ReturnResponse>("/returns", input);
  return res.data;
}
