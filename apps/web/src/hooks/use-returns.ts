"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReturnCreateInput } from "@kwinna/contracts";
import {
  fetchReturns,
  fetchReturnsSummary,
  postReturn,
  type ReturnsSummaryData,
} from "@/services/returns";

const EMPTY_SUMMARY: ReturnsSummaryData = {
  total: 0, lostQuantity: 0, lostValue: 0,
  byReason: { quality: 0, detail: 0, color: 0, size: 0, not_as_expected: 0 },
};

// ─── useReturnsSummary ────────────────────────────────────────────────────────

export function useReturnsSummary(from: Date, to: Date) {
  const query = useQuery({
    queryKey:  ["returns", "summary", from.toISOString(), to.toISOString()],
    queryFn:   () => fetchReturnsSummary(from, to),
    staleTime: 60_000,
    retry:     false,
  });

  return {
    summary:   query.data ?? EMPTY_SUMMARY,
    isLoading: query.isLoading,
    isError:   query.isError,
  };
}

// ─── useReturns ───────────────────────────────────────────────────────────────

export function useReturns() {
  const query = useQuery({
    queryKey:  ["returns", "list"],
    queryFn:   fetchReturns,
    staleTime: 60_000,
  });

  return {
    returns:   query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
    refetch:   query.refetch,
  };
}

// ─── useCreateReturn ──────────────────────────────────────────────────────────

export function useCreateReturn() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: ReturnCreateInput) => postReturn(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending:   mutation.isPending,
    isError:     mutation.isError,
    error:       mutation.error,
  };
}
