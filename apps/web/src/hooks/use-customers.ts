"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CustomerMetrics } from "@kwinna/contracts";
import { fetchCustomers, banCustomer, unbanCustomer } from "@/services/users";
import { customerKeys } from "./query-keys";

export interface UseCustomersResult {
  customers: CustomerMetrics[];
  isLoading: boolean;
  isError:   boolean;
  error:     Error | null;
  refetch:   () => void;
}

export function useCustomers(): UseCustomersResult {
  const query = useQuery({
    queryKey: customerKeys.lists(),
    queryFn:  () => fetchCustomers().then((r) => r.data),
    staleTime: 60_000,
  });

  return {
    customers: query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
    error:     query.error,
    refetch:   query.refetch,
  };
}

export function useBanCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => banCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

export function useUnbanCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unbanCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}
