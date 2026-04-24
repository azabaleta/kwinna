import type { NextFunction, Request, Response } from "express";
import type { RegisterInput, ResetPasswordInput } from "@kwinna/contracts";
import type { LoginInput } from "../services/auth.service";
import { login, register, verifyEmail, verifyEmailByCode, resendVerification, requestPasswordReset, resetPassword } from "../services/auth.service";

export async function postLogin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await login(req.body as LoginInput);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function postRegister(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await register(req.body as RegisterInput);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/verify-email ──────────────────────────────────────────────────
// Verifica el token del email, marca al usuario como verificado y emite JWT.

export async function postVerifyEmail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token } = req.body as { token?: string };
    if (!token) {
      res.status(400).json({ error: "Token requerido" });
      return;
    }
    const result = await verifyEmail(token);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/resend-verification ──────────────────────────────────────────
// Reenvía el email de verificación. Responde siempre 200 (evita enumeración).

export async function postResendVerification(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body as { email?: string };
    if (email) {
      await resendVerification(email);
    }
    res.json({ message: "Si el email existe y no está verificado, recibirás un nuevo enlace." });
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/verify-email-code ────────────────────────────────────────────
// Verifica el email usando el código corto de 6 dígitos (alternativa al link).

export async function postVerifyEmailByCode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { code } = req.body as { code: string };
    const result = await verifyEmailByCode(code);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/forgot-password ───────────────────────────────────────────────
// Solicita el envío del link de restablecimiento. Responde siempre 200.

export async function postForgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body as { email?: string };
    if (email) {
      await requestPasswordReset(email);
    }
    res.json({ message: "Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña." });
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/reset-password ────────────────────────────────────────────────
// Valida el token y actualiza la contraseña.

export async function postResetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await resetPassword(req.body as ResetPasswordInput);
    res.json({ message: "Contraseña actualizada correctamente. Ya podés iniciar sesión." });
  } catch (err) {
    next(err);
  }
}
