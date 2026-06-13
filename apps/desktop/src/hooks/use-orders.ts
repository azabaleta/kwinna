import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SaleStatus } from "@kwinna/contracts";
import { fetchWebOrders, updateOrderStatus } from "../services/sales";
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

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SaleStatus }) => updateOrderStatus(id, status),
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
