"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Sale, SaleResponse } from "@kwinna/contracts";
import { postSale, type CreateSalePayload } from "@/services/sale";
import { saleKeys, stockKeys } from "./query-keys";

// ─── useCreateSale ────────────────────────────────────────────────────────────

export interface UseCreateSaleResult {
  mutate: (payload: CreateSalePayload) => void;
  mutateAsync: (payload: CreateSalePayload) => Promise<SaleResponse>;
  sale: Sale | undefined;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
}

export function useCreateSale(): UseCreateSaleResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: postSale,
    onSuccess: () => {
      // Una venta descuenta stock: invalida toda la rama de stock
      // para que la UI refleje las cantidades actualizadas sin refetch manual.
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
      // Invalida también sales por si en el futuro se muestra historial
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    sale: mutation.data?.data,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  };
}
