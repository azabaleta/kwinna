import {
  LoginResponseSchema,
  RegisterResponseSchema,
  type Auth,
  type ForgotPasswordInput,
  type LoginResponse,
  type RegisterInput,
  type RegisterResponse,
  type ResetPasswordInput,
} from "@kwinna/contracts";
import apiClient from "@/lib/axios";

export async function postLogin(credentials: Auth): Promise<LoginResponse> {
  const res = await apiClient.post("/auth/login", credentials);
  return LoginResponseSchema.parse(res.data);
}

export async function postRegister(input: RegisterInput): Promise<RegisterResponse> {
  const res = await apiClient.post("/auth/register", input);
  return RegisterResponseSchema.parse(res.data);
}

export async function postVerifyEmail(token: string): Promise<LoginResponse> {
  const res = await apiClient.post("/auth/verify-email", { token });
  return LoginResponseSchema.parse(res.data);
}

export async function postResendVerification(email: string): Promise<void> {
  await apiClient.post("/auth/resend-verification", { email });
}

export async function postForgotPassword(input: ForgotPasswordInput): Promise<void> {
  await apiClient.post("/auth/forgot-password", input);
}

export async function postResetPassword(input: ResetPasswordInput): Promise<void> {
  await apiClient.post("/auth/reset-password", input);
}
