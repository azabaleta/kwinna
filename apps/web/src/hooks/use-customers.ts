"use client";

import { useQuery } from "@tanstack/react-query";
import type { CustomerMetrics } from "@kwinna/contracts";
import { fetchCustomers } from "@/services/users";
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
