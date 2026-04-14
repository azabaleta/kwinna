"use client";

import Link from "next/link";
import { MapPin, Plus, ShoppingBag } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { selectUser, useAuthStore } from "@/store/use-auth-store";

// ─── Mocked address type (future: moves to contracts once backend supports it) ─

interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  province: string;
  zip: string;
}

const MOCK_ADDRESSES: Address[] = [
  {
    id: "addr-001",
    label: "Casa",
    street: "Av. Santa Fe 2450, Piso 3 B",
    city: "Buenos Aires",
    province: "CABA",
    zip: "C1123",
  },
];

// ─── Initials avatar ──────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground select-none shadow-soft">
      {initials}
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ─── Page content ─────────────────────────────────────────────────────────────

function ProfileContent() {
  const user = useAuthStore(selectUser);

  // AuthGuard guarantees user is non-null here; null check satisfies TypeScript.
  if (!user) return null;

  const roleLabel  = user.role === "admin" ? "Administrador" : "Operador";
  const roleBadge  = user.role === "admin" ? "default" : "secondary";

  return (
    <main className="min-h-screen bg-background px-4 py-10 md:px-8">
      <div className="mx-auto max-w-2xl space-y-10">

        {/* ── Identity header ──────────────────────────────────────── */}
        <div className="flex items-center gap-5">
          <Avatar name={user.name} />
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {user.name}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Badge variant={roleBadge} className="mt-1 text-[10px] tracking-widest uppercase">
              {roleLabel}
            </Badge>
          </div>
        </div>

        <div className="h-px bg-border/50" />

        {/* ── Personal data ─────────────────────────────────────────── */}
        <Section title="Datos personales">
          <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
            {[
              { label: "Nombre",  value: user.name  },
              { label: "Email",   value: user.email },
              { label: "Rol",     value: roleLabel  },
              { label: "ID",      value: user.id    },
            ].map((row, i) => (
              <div
                key={row.label}
                className={`flex items-start justify-between gap-4 px-5 py-3.5 ${i !== 0 ? "border-t border-border/40" : ""}`}
              >
                <span className="shrink-0 text-xs text-muted-foreground">
                  {row.label}
                </span>
                <span className="truncate text-right text-xs font-medium text-foreground">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Order history placeholder ──────────────────────────────── */}
        <Section title="Mis pedidos">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border/60 bg-card/50 py-10 text-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground/20" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Sin pedidos aún
              </p>
              <p className="text-xs text-muted-foreground">
                Tus compras anteriores aparecerán aquí.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full px-5 text-[11px] tracking-widest uppercase"
            >
              <Link href="/shop">Explorar colección</Link>
            </Button>
          </div>
        </Section>

        {/* ── Delivery addresses ────────────────────────────────────── */}
        <Section title="Mis direcciones de entrega">
          <div className="space-y-2">
            {MOCK_ADDRESSES.map((addr) => (
              <div
                key={addr.id}
                className="flex items-start gap-4 rounded-xl border border-border/50 bg-card p-4"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">
                    {addr.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {addr.street}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {addr.city}, {addr.province} {addr.zip}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Placeholder: add address — functionality reserved for future step */}
          <Button
            variant="outline"
            size="sm"
            disabled
            className="w-full gap-2 rounded-full border-dashed text-[11px] tracking-widest uppercase"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar dirección
          </Button>
          <p className="text-center text-[11px] text-muted-foreground/50">
            Gestión de direcciones disponible próximamente.
          </p>
        </Section>

      </div>
    </main>
  );
}

// ─── Page (protected) ─────────────────────────────────────────────────────────

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
