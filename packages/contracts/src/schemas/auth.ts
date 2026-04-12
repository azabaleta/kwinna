import { z } from "zod";

// ─── User ─────────────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["admin", "operator"]),
});

export type User = z.infer<typeof UserSchema>;

// ─── Login Request ────────────────────────────────────────────────────────────

export const AuthSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type Auth = z.infer<typeof AuthSchema>;

// ─── Login Response ───────────────────────────────────────────────────────────

export const LoginResponseSchema = z.object({
  user: UserSchema,
  token: z.string().min(1),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
