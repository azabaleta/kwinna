"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OperatorCreateInput, OperatorUpdateInput } from "@kwinna/contracts";
import {
  fetchOperators,
  createOperator,
  updateOperator,
  deactivateOperator,
  reactivateOperator,
} from "@/services/operators";
import { operatorKeys } from "./query-keys";

export function useOperators() {
  const query = useQuery({
    queryKey: operatorKeys.lists(),
    queryFn:  () => fetchOperators().then((r) => r.data),
    staleTime: 30_000,
  });

  return {
    operators: query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
    refetch:   query.refetch,
  };
}

export function useCreateOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OperatorCreateInput) => createOperator(input),
    onSuccess:  () => qc.invalidateQueries({ queryKey: operatorKeys.lists() }),
  });
}

export function useUpdateOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OperatorUpdateInput }) =>
      updateOperator(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: operatorKeys.lists() }),
  });
}

export function useDeactivateOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateOperator(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: operatorKeys.lists() }),
  });
}

export function useReactivateOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reactivateOperator(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: operatorKeys.lists() }),
  });
}
