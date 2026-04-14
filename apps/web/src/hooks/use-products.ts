"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Product, ProductCreateInput, ProductListResponse } from "@kwinna/contracts";
import { fetchProduct, fetchProducts, postProduct } from "@/services/product";
import { productKeys } from "./query-keys";

// ─── useProducts ──────────────────────────────────────────────────────────────

export interface UseProductsResult {
  products: ProductListResponse["data"];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useProducts(): UseProductsResult {
  const query = useQuery({
    queryKey: productKeys.lists(),
    queryFn: fetchProducts,
    select: (data) => data.data,
  });

  return {
    products: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ─── useProduct ───────────────────────────────────────────────────────────────

export interface UseProductResult {
  product: Product | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useProduct(id: Product["id"]): UseProductResult {
  const query = useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => fetchProduct(id),
    enabled: Boolean(id),
  });

  return {
    product: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ─── useCreateProduct ─────────────────────────────────────────────────────────

export interface UseCreateProductResult {
  mutateAsync: (input: ProductCreateInput) => Promise<Product>;
  isPending:   boolean;
  isError:     boolean;
  error:       Error | null;
}

export function useCreateProduct(): UseCreateProductResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: ProductCreateInput) => {
      const res = await postProduct(input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending:   mutation.isPending,
    isError:     mutation.isError,
    error:       mutation.error,
  };
}
