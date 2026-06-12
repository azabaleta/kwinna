import {
  ShippingZoneListResponseSchema,
  ShippingZoneResponseSchema,
  type ShippingZone,
  type ShippingZoneCreateInput,
  type ShippingZoneUpdateInput,
} from "@kwinna/contracts";
import apiClient from "@/lib/axios";

export async function fetchShippingZones(): Promise<ShippingZone[]> {
  const res = await apiClient.get("/shipping/zones");
  return ShippingZoneListResponseSchema.parse(res.data).data;
}

export async function postShippingZone(payload: ShippingZoneCreateInput): Promise<ShippingZone> {
  const res = await apiClient.post("/shipping/zones", payload);
  return ShippingZoneResponseSchema.parse(res.data).data;
}

export async function patchShippingZone(id: string, payload: ShippingZoneUpdateInput): Promise<ShippingZone> {
  const res = await apiClient.patch(`/shipping/zones/${id}`, payload);
  return ShippingZoneResponseSchema.parse(res.data).data;
}

export async function deleteShippingZone(id: string): Promise<void> {
  await apiClient.delete(`/shipping/zones/${id}`);
}
