import {
  CustomerListResponseSchema,
  type CustomerListResponse,
} from "@kwinna/contracts";
import apiClient from "@/lib/axios";

export async function fetchCustomers(): Promise<CustomerListResponse> {
  const res = await apiClient.get("/users/customers");
  return CustomerListResponseSchema.parse(res.data);
}
