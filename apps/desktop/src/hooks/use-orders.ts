import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWebOrders, markAsAssembled } from "../services/sales";
import { orderKeys } from "./query-keys";

export function useWebOrders() {
  const query = useQuery({
    queryKey:        orderKeys.webOrders,
    queryFn:         fetchWebOrders,
    refetchInterval: 60_000,
  });

  return {
    orders:       query.data ?? [],
    isLoading:    query.isLoading,
    isError:      query.isError,
    isRefetching: query.isRefetching,
    refetch:      query.refetch,
  };
}

export function useMarkAssembled() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => markAsAssembled(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.webOrders });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending:   mutation.isPending,
    error:       mutation.error,
  };
}
