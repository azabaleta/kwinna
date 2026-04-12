"use client";

import { useQuery } from "@tanstack/react-query";
import type { Product, ProductListResponse } from "@kwinna/contracts";
import { fetchProduct, fetchProducts } from "@/services/product";
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
