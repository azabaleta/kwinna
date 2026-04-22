"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Product,
  ProductBulkInput,
  ProductBulkResponse,
  ProductCreateInput,
  ProductListResponse,
} from "@kwinna/contracts";
import {
  deleteProduct,
  fetchProduct,
  fetchProducts,
  patchProduct,
  postBulkProducts,
  postProduct,
} from "@/services/product";
import type { ProductUpdateFormValues } from "@/schemas/product";
import { productKeys, stockKeys } from "./query-keys";

// ─── useProducts ──────────────────────────────────────────────────────────────

export interface UseProductsResult {
  products: ProductListResponse["data"];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useProducts(q?: string): UseProductsResult {
  const query = useQuery({
    queryKey: productKeys.lists(q),
    queryFn: () => fetchProducts(q),
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
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending:   mutation.isPending,
    isError:     mutation.isError,
    error:       mutation.error,
  };
}

// ─── useBulkCreateProducts ────────────────────────────────────────────────────

export interface UseBulkCreateProductsResult {
  mutateAsync: (input: ProductBulkInput) => Promise<ProductBulkResponse>;
  isPending:   boolean;
  isError:     boolean;
  error:       Error | null;
}

export function useBulkCreateProducts(): UseBulkCreateProductsResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: postBulkProducts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
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

// ─── useUpdateProduct ─────────────────────────────────────────────────────────

export interface UseUpdateProductResult {
  mutateAsync: (input: ProductUpdateFormValues) => Promise<Product>;
  isPending:   boolean;
  isError:     boolean;
  error:       Error | null;
}

export function useUpdateProduct(id: Product["id"]): UseUpdateProductResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: ProductUpdateFormValues) =>
      patchProduct(id, input).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending:   mutation.isPending,
    isError:     mutation.isError,
    error:       mutation.error,
  };
}

// ─── useDeleteProduct ─────────────────────────────────────────────────────────

export interface UseDeleteProductResult {
  mutateAsync: (vars: { id: Product["id"]; password: string }) => Promise<void>;
  isPending:   boolean;
}

export function useDeleteProduct(): UseDeleteProductResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, password }: { id: Product["id"]; password: string }) =>
      deleteProduct(id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending:   mutation.isPending,
  };
}
