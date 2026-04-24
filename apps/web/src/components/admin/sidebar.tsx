"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { BarChart3, CalendarCheck, LayoutDashboard, LogOut, Menu, Package2, RotateCcw, ShoppingBag, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { selectUser, useAuthStore } from "@/store/use-auth-store";

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard",       icon: LayoutDashboard },
  { href: "/admin/today",     label: "Pedidos del día", icon: CalendarCheck   },
  { href: "/admin/inventory", label: "Inventario",      icon: Package2        },
  { href: "/admin/orders",    label: "Pedidos",         icon: ShoppingBag     },
  { href: "/admin/customers", label: "Clientes",        icon: Users           },
  { href: "/admin/returns",   label: "Devoluciones",    icon: RotateCcw       },
  { href: "/admin/reports",   label: "Reportes",        icon: BarChart3       },
] as const;

// ─── Isotipo inline (no SVGR configured in next.config) ───────────────────────

function IsotipoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 976.91 524.76"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M280.26.28c-103.19-5.26-103.52,64.28-100.34,144.94,0,0,0,159.8,0,159.8,0,34.84-28.34,63.18-63.18,63.18-36.08,1.89-67.01-26.9-66.89-63.18,0,0,0-163.52,0-163.52H1.54c4.57,95.06-34.55,271.9,111.49,275,62.84,2.01,115.32-48.53,115.2-111.49.94-46.4-.68-182.32,0-226.69-.39-28.27,30.18-32.02,52.03-29.73,16.39,0,29.73,13.33,29.73,29.73,0,0,0,66.89,0,66.89v234.13c-3.44,80.06-2.32,150.68,100.34,144.94,80.66-4.35,81.12-74.96,78.04-137.5,0,0,0-7.43,0-7.43v-144.94c1.16-83.55,128.9-83.61,130.07,0,0,0,0,144.93,0,144.93,0,0,0,7.43,0,7.43-3.19,62.29-2.43,133.4,78.05,137.5,78.95,5.85,106.97-42.04,100.33-115.21-.27-17.31.2-153.84,0-174.67,0-34.84,28.34-63.18,63.18-63.18,36.07-1.89,67.02,26.9,66.89,63.18,0,0,0,174.67,0,174.67h48.31c-5.86-95.66,37.94-283.44-111.49-286.15-62.84-2-115.32,48.53-115.2,111.49-.59,46.99.42,166.6,0,211.83.39,28.27-30.18,32.02-52.03,29.73-16.39,0-29.73-13.33-29.73-29.73.24-43.6-.17-166.45,0-211.83.12-62.95-52.37-113.49-115.21-111.49-140.61,4.61-108.86,161.91-111.49,256.43-.38,3.51.27,61.97,0,66.89.39,28.27-30.19,32.02-52.04,29.73-16.39,0-29.72-13.34-29.72-29.73,0,0,0-66.89,0-66.89v-234.13c2.23-63.34,6.48-140.61-78.04-144.94"
      />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar() {
  const router       = useRouter();
  const pathname     = usePathname();
  const user         = useAuthStore(selectUser);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [open, setOpen] = useState(false);

  // Cerrar drawer al cambiar de ruta
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloquear scroll del body cuando el drawer está abierto (mobile)
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleLogout() {
    clearSession();
    toast.info("Sesión cerrada");
    router.replace("/login");
  }

  return (
    <>
      {/* ── Mobile top bar — solo visible en mobile ─────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls="admin-sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/shop" className="flex items-center gap-2" title="Ver tienda">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
            <IsotipoIcon className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-semibold text-foreground">Kwinna</span>
        </Link>
      </header>

      {/* ── Backdrop mobile — solo cuando el drawer está abierto ─────────── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar (drawer en mobile, estático en desktop) ───────────────── */}
      <aside
        id="admin-sidebar"
        aria-label="Menú de administración"
        className={cn(
          // Base: fixed en mobile, relativo en desktop
          "fixed inset-y-0 left-0 z-50 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card transition-transform duration-200 ease-out",
          "lg:relative lg:z-auto lg:translate-x-0",
          // Mobile — visibilidad controlada por `open`
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >

        {/* ── Brand → link a la tienda ── */}
        <div className="flex h-14 items-center justify-between gap-2.5 border-b border-border pl-4 pr-2">
          <Link
            href="/shop"
            className="group flex items-center gap-2.5 transition-opacity hover:opacity-70"
            title="Ver tienda"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <IsotipoIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-semibold text-foreground">Kwinna</span>
              <span className="text-[10px] text-muted-foreground transition-colors group-hover:text-foreground">
                Ver tienda →
              </span>
            </div>
          </Link>

          {/* Botón cerrar — solo en mobile */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ── User + Logout ── */}
        <div className="space-y-2 border-t border-border p-3">
          {user && (
            <div className="px-3 py-1">
              <p className="truncate text-xs font-medium text-foreground">{user.name}</p>
              <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>

      </aside>
    </>
  );
}
