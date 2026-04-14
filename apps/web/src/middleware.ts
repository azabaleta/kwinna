import { NextRequest, NextResponse } from "next/server";

const ADMIN_PREFIX   = "/admin";
const PROFILE_PREFIX = "/profile";
const LOGIN_PATH     = "/login";
const DEFAULT_ADMIN  = "/admin/dashboard";
const COOKIE_NAME    = "kwinna-token";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token   = req.cookies.get(COOKIE_NAME)?.value;
  const isAdmin = pathname.startsWith(ADMIN_PREFIX);
  const isLogin = pathname === LOGIN_PATH;
  const isProfile = pathname.startsWith(PROFILE_PREFIX);

  // Admin o perfil sin token → /login
  if ((isAdmin || isProfile) && !token) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  // Login con token activo → /admin/dashboard
  if (isLogin && token) {
    const url = req.nextUrl.clone();
    url.pathname = DEFAULT_ADMIN;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Excluye _next internals, archivos estáticos y api routes
  matcher: ["/admin/:path*", "/login", "/profile/:path*"],
};
