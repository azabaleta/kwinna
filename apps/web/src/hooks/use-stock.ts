"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Stock, StockListResponse, StockMovement, StockMovementResponse } from "@kwinna/contracts";
import { fetchProductStock, fetchStock, fetchStockMovements, fetchAllStockMovements, postStockIn, postStockOut, type StockInPayload, type StockOutPayload } from "@/services/stock";
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

// ─── useStockMovements ────────────────────────────────────────────────────────
// Ingresos de mercadería ("in") en un rango — para el Sell-Through Rate por variante.

export function useStockMovements(from: Date, to: Date): {
  movements: StockMovement[];
  isLoading: boolean;
  isError:   boolean;
} {
  const query = useQuery({
    queryKey:  stockKeys.movements(from.toISOString(), to.toISOString()),
    queryFn:   () => fetchStockMovements(from, to),
    staleTime: 60_000,
    retry:     false,
  });
  return {
    movements: query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
  };
}

// ─── useInfiniteStockMovements (Kardex) ──────────────────────────────────────
// Paginación "cargar más" — 50 registros por página, acumulados en el cliente.

const PAGE_SIZE = 50;

export function useInfiniteStockMovements(from: Date, to: Date, productId?: string) {
  const query = useInfiniteQuery({
    queryKey:  [...stockKeys.all, "movements-paged", from.toISOString(), to.toISOString(), productId ?? "all"],
    queryFn:   ({ pageParam }) =>
      fetchAllStockMovements(from, to, productId, PAGE_SIZE, (pageParam as number) * PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.data.length, 0);
      return loaded < lastPage.total ? allPages.length : undefined;
    },
    staleTime: 60_000,
    retry:     false,
  });

  const movements = query.data?.pages.flatMap((p) => p.data) ?? [];
  const total     = query.data?.pages[0]?.total ?? 0;

  return {
    movements,
    total,
    isLoading:          query.isLoading,
    isError:            query.isError,
    hasNextPage:        query.hasNextPage,
    fetchNextPage:      query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
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

// ─── useStockOut ──────────────────────────────────────────────────────────────

export interface UseStockOutResult {
  mutate: (payload: StockOutPayload) => void;
  mutateAsync: (payload: StockOutPayload) => Promise<StockMovementResponse>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export function useStockOutMutation(): UseStockOutResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: postStockOut,
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
