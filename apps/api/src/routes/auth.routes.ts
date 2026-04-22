import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  AuthSchema,
  ForgotPasswordInputSchema,
  RegisterInputSchema,
  ResendVerificationInputSchema,
  ResetPasswordInputSchema,
  VerifyEmailInputSchema,
} from "@kwinna/contracts";
import {
  postForgotPassword,
  postLogin,
  postRegister,
  postResendVerification,
  postResetPassword,
  postVerifyEmail,
} from "../controllers/auth.controller";
import { validate } from "../middlewares/validate";

const router = Router();

// 10 intentos por IP cada 15 minutos — bloquea brute force sin afectar uso legítimo
const loginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: "Demasiados intentos. Intentá de nuevo en 15 minutos.", code: 429 },
});

// 5 registros por IP por hora — previene email bombing y flood de cuentas
const registerLimiter = rateLimit({
  windowMs:         60 * 60 * 1000,
  max:              5,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: "Demasiados intentos de registro. Intentá de nuevo en una hora.", code: 429 },
});

// POST /auth/login — acceso admin/operador/cliente
router.post("/login", loginLimiter, validate(AuthSchema), postLogin);

// POST /auth/register — registro público de clientes
router.post("/register", registerLimiter, validate(RegisterInputSchema), postRegister);

// POST /auth/verify-email — valida token y activa la cuenta
router.post("/verify-email", validate(VerifyEmailInputSchema), postVerifyEmail);

// POST /auth/resend-verification — reenvía email de verificación
router.post("/resend-verification", validate(ResendVerificationInputSchema), postResendVerification);

// POST /auth/forgot-password — solicita link de restablecimiento (responde siempre 200)
router.post("/forgot-password", validate(ForgotPasswordInputSchema), postForgotPassword);

// POST /auth/reset-password — valida token y actualiza contraseña
router.post("/reset-password", validate(ResetPasswordInputSchema), postResetPassword);

export default router;
