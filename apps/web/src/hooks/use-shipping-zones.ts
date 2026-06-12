import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ShippingZone, ShippingZoneCreateInput, ShippingZoneUpdateInput } from "@kwinna/contracts";
import {
  fetchShippingZones,
  postShippingZone,
  patchShippingZone,
  deleteShippingZone,
} from "@/services/shipping-zones";

const QK = ["shipping-zones"] as const;

export function useShippingZones() {
  return useQuery<ShippingZone[]>({
    queryKey: QK,
    queryFn:  fetchShippingZones,
    staleTime: 5 * 60 * 1000, // 5 min — no cambia frecuentemente
  });
}

export function useCreateShippingZone() {
  const qc = useQueryClient();
  return useMutation<ShippingZone, Error, ShippingZoneCreateInput>({
    mutationFn: postShippingZone,
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useUpdateShippingZone() {
  const qc = useQueryClient();
  return useMutation<ShippingZone, Error, { id: string; payload: ShippingZoneUpdateInput }>({
    mutationFn: ({ id, payload }) => patchShippingZone(id, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK }),
  });
}

export function useDeleteShippingZone() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteShippingZone,
    onSuccess:  () => qc.invalidateQueries({ queryKey: QK }),
  });
}
