import jwt from "jsonwebtoken";
import type { LoginResponse, User } from "@kwinna/contracts";

// ─── Config ───────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env["JWT_SECRET"] ?? "kwinna-dev-secret-change-in-prod";
const JWT_EXPIRES_IN = "8h";

// ─── Hardcoded users (MVP) ────────────────────────────────────────────────────
// TODO: reemplazar por consulta a base de datos cuando se migre de in-memory.

interface StoredUser extends User {
  passwordHash: string;
}

const USERS: StoredUser[] = [
  {
    id: "880e8400-e29b-41d4-a716-446655440001",
    email: "admin@kwinna.com",
    name: "Administrador",
    role: "admin",
    passwordHash: "admin123", // plaintext MVP — en prod usar bcrypt
  },
  {
    id: "880e8400-e29b-41d4-a716-446655440002",
    email: "operador@kwinna.com",
    name: "Operador",
    role: "operator",
    passwordHash: "operador123",
  },
];

// ─── Service ──────────────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
}

export function login(input: LoginInput): LoginResponse {
  const stored = USERS.find(
    (u) => u.email === input.email && u.passwordHash === input.password
  );

  if (!stored) {
    const err = new Error("Credenciales inválidas");
    (err as Error & { statusCode: number }).statusCode = 401;
    throw err;
  }

  const { passwordHash: _, ...user } = stored;

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return { user, token };
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: "admin" | "operator";
  iat: number;
  exp: number;
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
