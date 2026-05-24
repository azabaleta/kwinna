"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SocialFormData } from "@kwinna/contracts";
import { fetchDraft, saveDraft, deleteDraft } from "@/services/social-form";

const QUERY_KEY = ["social-form", "draft"] as const;

export function useSocialFormDraft() {
  return useQuery({
    queryKey:  QUERY_KEY,
    queryFn:   fetchDraft,
    // No re-fetch automático — el borrador solo cambia cuando el usuario lo modifica.
    staleTime: Infinity,
    retry:     1,
  });
}

export function useSaveDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SocialFormData) => saveDraft(data),
    onSuccess:  (result) => {
      qc.setQueryData(QUERY_KEY, result);
    },
  });
}

export function useDeleteDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDraft,
    onSuccess:  () => {
      qc.setQueryData(QUERY_KEY, { data: null, updatedAt: null });
    },
  });
}
