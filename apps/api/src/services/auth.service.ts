import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { LoginResponse, RegisterInput, RegisterResponse, ResetPasswordInput, User } from "@kwinna/contracts";
import {
  createUser,
  deleteUser,
  findUserByEmail,
  markEmailVerified,
  updatePassword,
} from "../db/repositories/user.repository";
import {
  findLastTokenForUser,
  findValidToken,
  insertToken,
  markTokenUsed,
} from "../db/repositories/email-token.repository";
import {
  findLastResetTokenForUser,
  findValidResetToken,
  insertResetToken,
  markResetTokenUsed,
} from "../db/repositories/password-reset-token.repository";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email.service";

// Hash inválido usado para igualar el tiempo de respuesta cuando el usuario no existe.
// bcrypt.compare() contra este hash siempre retorna false, pero tarda igual que uno real.
const DUMMY_HASH = "$2b$12$invalidhashfortimingprotection00000000000000000000000u";

// ─── Config ───────────────────────────────────────────────────────────────────

// Bracket notation requerida: Nixpacks escanea process.env["X"] para detectar
// variables de entorno. La notación de punto (process.env.X) no la parsea correctamente
// y genera un ID vacío "" que rompe el build en Railway.
const JWT_SECRET = process.env["JWT_SECRET"]!;
if (!JWT_SECRET) throw new Error("JWT_SECRET env var is required");
const JWT_EXPIRES           = "8h";
const BCRYPT_ROUNDS         = 12;
const TOKEN_TTL_MS          = 24 * 60 * 60 * 1000;  // 24 horas
const RESEND_COOLDOWN_MS    = 60 * 1000;             // 60 segundos entre reenvíos
const RESET_TOKEN_TTL_MS    = 60 * 60 * 1000;        // 1 hora
const RESET_COOLDOWN_MS     = 60 * 1000;             // 60 segundos entre solicitudes

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeToken(user: User): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

function httpError(message: string, status: number): Error {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = status;
  return err;
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ─── Login ────────────────────────────────────────────────────────────────────

export interface LoginInput {
  email:    string;
  password: string;
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const stored = await findUserByEmail(input.email);

  // Siempre correr bcrypt aunque el usuario no exista — iguala el tiempo de respuesta
  // para evitar que un atacante enumere emails por diferencia de latencia.
  const hash  = stored?.passwordHash ?? DUMMY_HASH;
  const match = await bcrypt.compare(input.password, hash);

  // Mismo error para email desconocido y contraseña incorrecta — evita enumeración
  const invalid = httpError("Credenciales inválidas", 401);
  if (!stored || !match) throw invalid;

  if (!stored.emailVerified) {
    throw httpError("Email no verificado. Revisá tu casilla y confirmá tu cuenta.", 403);
  }

  const { passwordHash: _, ...user } = stored;
  return { user, token: makeToken(user) };
}

// ─── Register (clientes públicos) ────────────────────────────────────────────

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw httpError("Ya existe una cuenta con ese email", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const stored = await createUser({
    email:         input.email,
    name:          input.name,
    passwordHash,
    role:          "customer",
    emailVerified: false,
  });

  // Si el envío del email falla, revertimos la creación para evitar cuentas huérfanas
  // (usuario atrapado: no puede loguear ni volver a registrarse con el mismo email).
  try {
    await sendEmailVerificationToken(stored.id, { name: stored.name, email: stored.email });
  } catch {
    await deleteUser(stored.id);
    throw httpError("No pudimos enviar el email de verificación. Intentá de nuevo en unos minutos.", 503);
  }

  return {
    message: "Cuenta creada. Revisá tu email para verificar tu dirección.",
    email:   stored.email,
  };
}

// ─── Verify email ─────────────────────────────────────────────────────────────

export async function verifyEmail(rawToken: string): Promise<LoginResponse> {
  const tokenHash = sha256(rawToken);
  const record    = await findValidToken(tokenHash);

  if (!record) {
    throw httpError("El enlace no es válido o ya expiró.", 400);
  }

  // Marcar token como usado y usuario como verificado (atómico a nivel de negocio)
  await markTokenUsed(record.id);
  await markEmailVerified(record.userId);

  // Buscar usuario para emitir JWT
  const { findUserById } = await import("../db/repositories/user.repository");
  const stored = await findUserById(record.userId);
  if (!stored) throw httpError("Usuario no encontrado", 404);

  const { passwordHash: _, ...user } = stored;
  return { user, token: makeToken(user) };
}

// ─── Resend verification ──────────────────────────────────────────────────────

export async function resendVerification(email: string): Promise<void> {
  const stored = await findUserByEmail(email);

  // Respuesta genérica aunque no exista el email — evita enumeración
  if (!stored || stored.emailVerified) return;

  // Cooldown: si ya hay un token reciente, no reenviar
  const last = await findLastTokenForUser(stored.id);
  if (last) {
    const elapsed = Date.now() - last.createdAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) return;
  }

  await sendEmailVerificationToken(stored.id, { name: stored.name, email: stored.email });
}

// ─── Internal: generar token y enviar email ───────────────────────────────────

async function sendEmailVerificationToken(
  userId: string,
  user:   { name: string; email: string },
): Promise<void> {
  const rawToken  = generateRawToken();
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await insertToken(userId, tokenHash, expiresAt);
  await sendVerificationEmail(user, rawToken);
}

// ─── Forgot password ──────────────────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<void> {
  const stored = await findUserByEmail(email);

  // Respuesta genérica — evita enumeración de emails
  if (!stored) return;

  // Cooldown: no reenviar si ya hay un token reciente
  const last = await findLastResetTokenForUser(stored.id);
  if (last) {
    const elapsed = Date.now() - last.createdAt.getTime();
    if (elapsed < RESET_COOLDOWN_MS) return;
  }

  const rawToken  = generateRawToken();
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await insertResetToken(stored.id, tokenHash, expiresAt);
  await sendPasswordResetEmail({ name: stored.name, email: stored.email }, rawToken);
}

// ─── Reset password ───────────────────────────────────────────────────────────

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = sha256(input.token);
  const record    = await findValidResetToken(tokenHash);

  if (!record) {
    throw httpError("El enlace no es válido o ya expiró.", 400);
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  await markResetTokenUsed(record.id);
  await updatePassword(record.userId, passwordHash);
}

// ─── JWT verification ─────────────────────────────────────────────────────────

export interface JwtPayload {
  sub:   string;
  email: string;
  role:  "admin" | "operator" | "customer";
  iat:   number;
  exp:   number;
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET as string) as JwtPayload;
}
