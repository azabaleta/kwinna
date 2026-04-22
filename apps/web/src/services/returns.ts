import type {
  Return,
  ReturnCreateInput,
  ReturnListResponse,
  ReturnResponse,
} from "@kwinna/contracts";
import apiClient from "@/lib/axios";
import { type AxiosError } from "axios";

export type { ReturnCreateInput };

export interface ReturnsSummaryData {
  total:        number;
  lostQuantity: number;
  lostValue:    number;
  byReason: {
    quality:         number;
    detail:          number;
    color:           number;
    size:            number;
    not_as_expected: number;
  };
}

export async function fetchReturns(): Promise<Return[]> {
  const res = await apiClient.get<ReturnListResponse>("/returns");
  return res.data.data;
}

export async function fetchReturnsSummary(
  from: Date,
  to:   Date,
): Promise<ReturnsSummaryData> {
  const res = await apiClient.get<{ data: ReturnsSummaryData }>("/returns/summary", {
    params: {
      from: from.toISOString(),
      to:   to.toISOString(),
    },
  });
  return res.data.data;
}

export async function postReturn(input: ReturnCreateInput): Promise<Return> {
  try {
    const res = await apiClient.post<ReturnResponse>("/returns", input);
    return res.data.data;
  } catch (err) {
    // Propaga el mensaje de error de la API como un Error estándar
    const apiMessage = (err as AxiosError<{ error?: string }>).response?.data?.error;
    throw new Error(apiMessage ?? "Error al registrar la devolución");
  }
}
