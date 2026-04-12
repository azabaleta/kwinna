import { LoginResponseSchema, type Auth, type LoginResponse } from "@kwinna/contracts";
import apiClient from "@/lib/axios";

export async function postLogin(credentials: Auth): Promise<LoginResponse> {
  const res = await apiClient.post("/auth/login", credentials);
  return LoginResponseSchema.parse(res.data);
}
