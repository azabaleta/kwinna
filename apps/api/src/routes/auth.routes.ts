import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  AuthSchema,
  ForgotPasswordInputSchema,
  RegisterInputSchema,
  ResendVerificationInputSchema,
  ResetPasswordInputSchema,
  VerifyEmailByCodeInputSchema,
  VerifyEmailInputSchema,
} from "@kwinna/contracts";
import {
  postForgotPassword,
  postLogin,
  postRegister,
  postResendVerification,
  postResetPassword,
  postVerifyEmail,
  postVerifyEmailByCode,
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

// POST /auth/verify-email-code — verifica con código corto de 6 dígitos
// Rate limit estricto: 10 intentos/IP cada 15 min (1M posibilidades, single-use)
const codeLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: "Demasiados intentos. Esperá 15 minutos.", code: 429 },
});
router.post("/verify-email-code", codeLimiter, validate(VerifyEmailByCodeInputSchema), postVerifyEmailByCode);

// POST /auth/forgot-password — solicita link de restablecimiento (responde siempre 200)
router.post("/forgot-password", validate(ForgotPasswordInputSchema), postForgotPassword);

// POST /auth/reset-password — valida token y actualiza contraseña
router.post("/reset-password", validate(ResetPasswordInputSchema), postResetPassword);

export default router;
