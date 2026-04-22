"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GenerateSnapshotInput } from "@kwinna/contracts";
import {
  deleteSnapshot,
  fetchSnapshots,
  generateSnapshot,
} from "@/services/reports";

export function useSnapshots() {
  const query = useQuery({
    queryKey:  ["reports", "snapshots"],
    queryFn:   fetchSnapshots,
    staleTime: 30_000,
  });
  return {
    snapshots:  query.data ?? [],
    isLoading:  query.isLoading,
    isError:    query.isError,
    refetch:    query.refetch,
  };
}

export function useGenerateSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateSnapshotInput) => generateSnapshot(input),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
}

export function useDeleteSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSnapshot(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
}
