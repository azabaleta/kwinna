import { z } from "zod";

// ─── User ─────────────────────────────────────────────────────────────────────
// "customer" permite que usuarios web registrados tengan un perfil real.

export const UserSchema = z.object({
  id:            z.string().uuid(),
  email:         z.string().email(),
  name:          z.string().min(1),
  role:          z.enum(["admin", "operator", "customer"]),
  emailVerified: z.boolean().default(false),
});

export type User = z.infer<typeof UserSchema>;

// ─── Login Request ────────────────────────────────────────────────────────────

export const AuthSchema = z.object({
  email:    z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type Auth = z.infer<typeof AuthSchema>;

// ─── Register Request (clientes públicos) ────────────────────────────────────

export const RegisterInputSchema = z.object({
  name:     z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100, "El nombre no puede superar los 100 caracteres").trim(),
  email:    z.string().email("Email inválido"),
  password: z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "La contraseña no puede superar los 72 caracteres"),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

// ─── Auth Response (login) ────────────────────────────────────────────────────

export const LoginResponseSchema = z.object({
  user:  UserSchema,
  token: z.string().min(1),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// ─── Register Response ────────────────────────────────────────────────────────
// Register no devuelve JWT — el usuario debe verificar su email primero.

export const RegisterResponseSchema = z.object({
  message: z.string(),
  email:   z.string().email(),
});

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

// ─── Email verification ───────────────────────────────────────────────────────

export const VerifyEmailInputSchema = z.object({
  token: z.string().min(1),
});

export type VerifyEmailInput = z.infer<typeof VerifyEmailInputSchema>;

export const ResendVerificationInputSchema = z.object({
  email: z.string().email(),
});

export type ResendVerificationInput = z.infer<typeof ResendVerificationInputSchema>;

// ─── Customer with purchase metrics ──────────────────────────────────────────
// Solo expuesto a admin/operator — contiene PII.

export const CustomerMetricsSchema = z.object({
  id:            z.string().uuid(),
  name:          z.string(),
  email:         z.string().email(),
  emailVerified: z.boolean(),
  createdAt:     z.string().datetime(),
  totalLifetime: z.number(),
  totalMonth:    z.number(),
  totalSemester: z.number(),
});

export type CustomerMetrics = z.infer<typeof CustomerMetricsSchema>;

export const CustomerListResponseSchema = z.object({
  data: z.array(CustomerMetricsSchema),
});

export type CustomerListResponse = z.infer<typeof CustomerListResponseSchema>;

// ─── Password reset ───────────────────────────────────────────────────────────

export const ForgotPasswordInputSchema = z.object({
  email: z.string().email("Email inválido"),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;

export const ResetPasswordInputSchema = z.object({
  token:    z.string().min(1),
  password: z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "La contraseña no puede superar los 72 caracteres"),
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;
