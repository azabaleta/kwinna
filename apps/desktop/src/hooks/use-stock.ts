import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllStock } from "../services/stock";
import { stockKeys } from "./query-keys";

// Refetch cada 30s: evita que el POS venda stock que ya compró un cliente web
export function useStock() {
  const query = useQuery({
    queryKey:       stockKeys.all,
    queryFn:        fetchAllStock,
    staleTime:      0,
    refetchInterval: 30_000,
  });

  return {
    stock:        query.data ?? [],
    isLoading:    query.isLoading,
    isRefetching: query.isRefetching,
  };
}

export function useInvalidateStock() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: stockKeys.all });
}
