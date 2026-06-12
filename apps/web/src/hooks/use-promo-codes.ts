import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PromoCode, PromoCodeCreateInput, PromoCodeUpdateInput } from "@kwinna/contracts";
import { fetchPromoCodes, postPromoCode, patchPromoCode, deletePromoCode } from "@/services/promo-codes";

const QK = ["promo-codes"] as const;

export function usePromoCodes() {
  return useQuery<PromoCode[]>({
    queryKey: QK,
    queryFn:  fetchPromoCodes,
  });
}

export function useCreatePromoCode() {
  const qc = useQueryClient();
  return useMutation<PromoCode, Error, PromoCodeCreateInput>({
    mutationFn: postPromoCode,
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useUpdatePromoCode() {
  const qc = useQueryClient();
  return useMutation<PromoCode, Error, { id: string; payload: PromoCodeUpdateInput }>({
    mutationFn: ({ id, payload }) => patchPromoCode(id, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useDeletePromoCode() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deletePromoCode,
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK }),
  });
}
