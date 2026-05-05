import {
  OperatorListResponseSchema,
  type Operator,
  type OperatorCreateInput,
  type OperatorListResponse,
  type OperatorUpdateInput,
} from "@kwinna/contracts";
import apiClient from "@/lib/axios";

export async function fetchOperators(): Promise<OperatorListResponse> {
  const res = await apiClient.get("/users/operators");
  return OperatorListResponseSchema.parse(res.data);
}

export async function createOperator(input: OperatorCreateInput): Promise<Operator> {
  const res = await apiClient.post("/users/operators", input);
  return (res.data as { data: Operator }).data;
}

export async function updateOperator(id: string, input: OperatorUpdateInput): Promise<Operator> {
  const res = await apiClient.patch(`/users/operators/${id}`, input);
  return (res.data as { data: Operator }).data;
}

export async function deactivateOperator(id: string): Promise<void> {
  await apiClient.delete(`/users/operators/${id}`);
}

export async function reactivateOperator(id: string): Promise<void> {
  await apiClient.patch(`/users/operators/${id}/reactivate`);
}
