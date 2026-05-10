import {
  CustomerListResponseSchema,
  type CustomerListResponse,
} from "@kwinna/contracts";
import apiClient from "@/lib/axios";

export async function fetchCustomers(): Promise<CustomerListResponse> {
  const res = await apiClient.get("/users/customers");
  return CustomerListResponseSchema.parse(res.data);
}

export async function banCustomer(id: string): Promise<void> {
  await apiClient.patch(`/users/customers/${id}/ban`);
}

export async function unbanCustomer(id: string): Promise<void> {
  await apiClient.patch(`/users/customers/${id}/unban`);
}
