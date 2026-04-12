"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { LayoutDashboard, LogOut, Package, Package2, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { selectUser, useAuthStore } from "@/store/use-auth-store";

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/inventory", label: "Inventario", icon: Package2 },
  { href: "/admin/orders",    label: "Pedidos",    icon: ShoppingBag },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardHeader() {
  const router   = useRouter();
  const pathname = usePathname();
  const user         = useAuthStore(selectUser);
  const clearSession = useAuthStore((s) => s.clearSession);

  function handleLogout() {
    clearSession();
    toast.info("Sesión cerrada");
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-8">

        {/* ── Brand + Nav ── */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">Kwinna</span>
          </div>

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── User + Logout ── */}
        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden text-sm text-muted-foreground sm:block">
              {user.name}
              <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-xs capitalize">
                {user.role}
              </span>
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </Button>
        </div>

      </div>
    </header>
  );
}
