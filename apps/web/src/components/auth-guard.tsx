"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { selectIsAuthenticated, useAuthStore } from "@/store/use-auth-store";

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Envuelve rutas que requieren sesión activa.
 * Redirige a /login si no hay token — sin flash de contenido protegido.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
