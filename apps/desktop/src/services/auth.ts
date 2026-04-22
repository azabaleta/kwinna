import { api } from "../lib/api";
import type { LoginResponse } from "@kwinna/contracts";

export async function login(email: string, password: string): Promise<LoginResponse> {
  return api.post<LoginResponse>("/auth/login", { email, password });
}
