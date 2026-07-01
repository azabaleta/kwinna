import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PromoStrip, PromoStripUpdateInput } from "@kwinna/contracts";
import { fetchPromoStrip, putPromoStrip } from "@/services/promo-strip";

const QK = ["promo-strip"] as const;

export function usePromoStrip() {
  return useQuery<PromoStrip>({
    queryKey:  QK,
    queryFn:   fetchPromoStrip,
    staleTime: 5 * 60 * 1000, // 5 min — cambia poco
  });
}

export function useUpdatePromoStrip() {
  const qc = useQueryClient();
  return useMutation<PromoStrip, Error, PromoStripUpdateInput>({
    mutationFn: putPromoStrip,
    onSuccess:  (data) => qc.setQueryData(QK, data),
  });
}
