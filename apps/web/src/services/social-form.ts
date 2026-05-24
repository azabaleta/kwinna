import type { SocialFormData, SocialFormDraftResponse } from "@kwinna/contracts";
import apiClient from "@/lib/axios";

export async function fetchDraft(): Promise<SocialFormDraftResponse> {
  const res = await apiClient.get<SocialFormDraftResponse>("/social-form");
  return res.data;
}

export async function saveDraft(data: SocialFormData): Promise<SocialFormDraftResponse> {
  const res = await apiClient.put<SocialFormDraftResponse>("/social-form", data);
  return res.data;
}

export async function deleteDraft(): Promise<void> {
  await apiClient.delete("/social-form");
}
