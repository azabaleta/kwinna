"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, LogOut, User, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  selectIsAuthenticated,
  selectUser,
  useAuthStore,
} from "@/store/use-auth-store";

// ─── Avatar con iniciales ─────────────────────────────────────────────────────

function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground select-none">
      {initials}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuthButton() {
  const router = useRouter();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const user            = useAuthStore(selectUser);
  const clearSession    = useAuthStore((s) => s.clearSession);

  // ── Deslogueado: botón que navega a /login ────────────────────────────────
  if (!isAuthenticated || !user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="gap-2"
        aria-label="Iniciar sesión"
      >
        <Link href="/login">
          <UserCircle className="h-4 w-4" />
          <span className="hidden text-[11px] font-semibold tracking-widest uppercase sm:inline">
            Ingresar
          </span>
        </Link>
      </Button>
    );
  }

  // ── Logueado: dropdown con perfil y logout ────────────────────────────────
  function handleLogout() {
    clearSession();
    router.push("/shop");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Menú de usuario"
        >
          <Initials name={user.name} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">

        {/* User info header */}
        <div className="px-2 py-2">
          <p className="truncate text-xs font-semibold text-foreground">
            {user.name}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {user.email}
          </p>
        </div>

        <DropdownMenuSeparator />

        {/* Mi Perfil */}
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <User className="h-3.5 w-3.5" />
            Mi Perfil
          </Link>
        </DropdownMenuItem>

        {/* Mis Favoritos */}
        <DropdownMenuItem asChild>
          <Link href="/favorites" className="cursor-pointer">
            <Heart className="h-3.5 w-3.5" />
            Mis Favoritos
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Cerrar Sesión */}
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar Sesión
        </DropdownMenuItem>

      </DropdownMenuContent>
    </DropdownMenu>
  );
}
