"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Stock, StockListResponse, StockMovementResponse } from "@kwinna/contracts";
import { fetchProductStock, fetchStock, postStockIn, type StockInPayload } from "@/services/stock";
import { stockKeys } from "./query-keys";

// ─── useStock ─────────────────────────────────────────────────────────────────

export interface UseStockResult {
  stock: StockListResponse["data"];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useStock(): UseStockResult {
  const query = useQuery({
    queryKey: stockKeys.lists(),
    queryFn: fetchStock,
    select: (data) => data.data,
  });

  return {
    stock: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ─── useProductStock ──────────────────────────────────────────────────────────
// Retorna todas las variantes de talle para un producto (Stock[]).

export interface UseProductStockResult {
  stock: Stock[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useProductStock(productId: Stock["productId"]): UseProductStockResult {
  const query = useQuery({
    queryKey: stockKeys.detail(productId),
    queryFn: () => fetchProductStock(productId),
    enabled: Boolean(productId),
  });

  return {
    stock: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ─── useStockIn ───────────────────────────────────────────────────────────────

export interface UseStockInResult {
  mutate: (payload: StockInPayload) => void;
  mutateAsync: (payload: StockInPayload) => Promise<StockMovementResponse>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export function useStockIn(): UseStockInResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: postStockIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
