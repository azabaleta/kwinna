"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Sale, SaleCheckoutResponse, SaleListResponse, SaleResponse } from "@kwinna/contracts";
import { fetchSales, postCheckout, postSale, putCancelSale, patchDismissSale, patchSaleStatus, type SaleOrderInput } from "@/services/sale";
import type { SaleDismissInput } from "@kwinna/contracts";
import { saleKeys, stockKeys } from "./query-keys";

// ─── useCreateSale — venta directa POS ───────────────────────────────────────

export interface UseCreateSaleResult {
  mutate:       (payload: SaleOrderInput) => void;
  mutateAsync:  (payload: SaleOrderInput) => Promise<SaleResponse>;
  sale:         Sale | undefined;
  isPending:    boolean;
  isSuccess:    boolean;
  isError:      boolean;
  error:        Error | null;
}

export function useCreateSale(): UseCreateSaleResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: postSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
    },
  });

  return {
    mutate:      mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    sale:        mutation.data?.data,
    isPending:   mutation.isPending,
    isSuccess:   mutation.isSuccess,
    isError:     mutation.isError,
    error:       mutation.error,
  };
}

// ─── useCheckout — Checkout Pro con MercadoPago ───────────────────────────────

export interface UseCheckoutResult {
  mutate:       (payload: SaleOrderInput) => void;
  mutateAsync:  (payload: SaleOrderInput) => Promise<SaleCheckoutResponse>;
  isPending:    boolean;
  isError:      boolean;
  error:        Error | null;
}

export function useCheckout(): UseCheckoutResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: postCheckout,
    onSuccess: () => {
      // Invalidar stock porque ya se descontó al crear la venta pending
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
    },
  });

  return {
    mutate:      mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending:   mutation.isPending,
    isError:     mutation.isError,
    error:       mutation.error,
  };
}

// ─── useSales — lista de ventas (admin/operator) ──────────────────────────────

export interface UseSalesResult {
  sales:     SaleListResponse["data"];
  isLoading: boolean;
  isError:   boolean;
  error:     Error | null;
  refetch:   () => void;
}

export function useSales(): UseSalesResult {
  const query = useQuery({
    queryKey: saleKeys.lists(),
    queryFn:  fetchSales,
    select:   (data) => data.data,
    refetchInterval: 30_000,
  });

  return {
    sales:     query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
    error:     query.error,
    refetch:   query.refetch,
  };
}

// ─── useCancelSale — cancela venta pending + restaura stock ───────────────────

export interface UseCancelSaleResult {
  mutateAsync: (id: string) => Promise<SaleResponse>;
  isPending:   boolean;
  isError:     boolean;
  error:       Error | null;
}

export function useCancelSale(): UseCancelSaleResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: putCancelSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending:   mutation.isPending,
    isError:     mutation.isError,
    error:       mutation.error,
  };
}

// ─── useDismissSale — desestima venta (excluir de métricas) ─────────────────

export interface UseDismissSaleResult {
  mutateAsync: (args: { id: string; payload: SaleDismissInput }) => Promise<SaleResponse>;
  isPending:   boolean;
  isError:     boolean;
  error:       Error | null;
}

export function useDismissSale(): UseDismissSaleResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SaleDismissInput }) => patchDismissSale(id, payload),
    onSuccess: (_, { payload }) => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      if (payload.restoreStock) {
        queryClient.invalidateQueries({ queryKey: stockKeys.all });
      }
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending:   mutation.isPending,
    isError:     mutation.isError,
    error:       mutation.error,
  };
}

// ─── useUpdateSaleStatus — actualiza estado de venta (ej. completed → assembled) ─

export interface UseUpdateSaleStatusResult {
  mutateAsync: (args: { id: string; status: string }) => Promise<SaleResponse>;
  isPending:   boolean;
}

export function useUpdateSaleStatus(): UseUpdateSaleStatusResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => patchSaleStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending:   mutation.isPending,
  };
}
