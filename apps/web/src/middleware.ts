import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_PREFIX   = "/admin";
const PROFILE_PREFIX = "/profile";
const LOGIN_PATH     = "/login";
const DEFAULT_ADMIN  = "/admin/dashboard";
const COOKIE_NAME    = "kwinna-token";

// Roles con acceso al panel de administración
const ADMIN_ROLES = new Set(["admin", "operator"]);

function redirectTo(req: NextRequest, path: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = path;
  return NextResponse.redirect(url);
}

/**
 * Verifica el JWT del cookie usando jose (Edge-compatible).
 * Retorna el payload si la firma es válida y el token no expiró; null si no.
 * Solo `jose` funciona en el Edge Runtime de Next.js — `jsonwebtoken` no.
 */
async function verifyJwt(
  token: string,
): Promise<{ role: string } | null> {
  const secret = process.env["JWT_SECRET"];
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    const role = payload["role"];
    if (typeof role !== "string") return null;
    return { role };
  } catch {
    // Token inválido, expirado o firma incorrecta
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token     = req.cookies.get(COOKIE_NAME)?.value;
  const isAdmin   = pathname.startsWith(ADMIN_PREFIX);
  const isLogin   = pathname === LOGIN_PATH;
  const isProfile = pathname.startsWith(PROFILE_PREFIX);

  // ── Rutas protegidas sin cookie → /login ──────────────────────────────────
  if ((isAdmin || isProfile) && !token) {
    return redirectTo(req, LOGIN_PATH);
  }

  // ── Cookie presente — verificar firma, expiración y rol ──────────────────
  if (token) {
    const payload = await verifyJwt(token);

    if (isAdmin || isProfile) {
      // Token inválido o expirado → limpiar cookie y redirigir a login
      if (!payload) {
        const res = redirectTo(req, LOGIN_PATH);
        res.cookies.delete(COOKIE_NAME);
        return res;
      }

      // Token válido pero rol insuficiente para el panel admin
      if (isAdmin && !ADMIN_ROLES.has(payload.role)) {
        const res = redirectTo(req, LOGIN_PATH);
        res.cookies.delete(COOKIE_NAME);
        return res;
      }
    }

    // Usuario autenticado con rol admin/operator en /login → panel
    if (isLogin && payload && ADMIN_ROLES.has(payload.role)) {
      return redirectTo(req, DEFAULT_ADMIN);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Excluye _next internals, archivos estáticos y api routes
  matcher: ["/admin/:path*", "/login", "/profile/:path*"],
};
