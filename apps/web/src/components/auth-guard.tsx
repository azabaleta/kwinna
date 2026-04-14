"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { selectIsAuthenticated, useAuthStore } from "@/store/use-auth-store";

interface AuthGuardProps {
  children:    ReactNode;
  /** Roles permitidos. Por defecto solo admin y operator acceden al panel. */
  allowedRoles?: string[];
}

const ADMIN_ROLES = ["admin", "operator"] as const;

/**
 * Doble barrera de seguridad para rutas de administración:
 *   1. Sin token → redirige a /login.
 *   2. Token con rol insuficiente (ej: "customer") → redirige a /login.
 *
 * El control de acceso real es el JWT en el backend; este guard evita
 * exponer la UI a roles no autorizados antes de que lleguen a llamar la API.
 */
export function AuthGuard({
  children,
  allowedRoles = ADMIN_ROLES as unknown as string[],
}: AuthGuardProps) {
  const router         = useRouter();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const user           = useAuthStore((s) => s.user);

  const hasRole = isAuthenticated && user != null && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!isAuthenticated || !hasRole) {
      router.replace("/login");
    }
  }, [isAuthenticated, hasRole, router]);

  if (!isAuthenticated || !hasRole) return null;

  return <>{children}</>;
}
