"use client";

import { useState } from "react";
import { Users, Search, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCustomers } from "@/hooks/use-customers";
import { useSales } from "@/hooks/use-sale";
import { cn } from "@/lib/utils";
import { CustomerDetailSheet } from "@/components/admin/customer-detail-sheet";
import type { CustomerMetrics } from "@kwinna/contracts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day:   "2-digit",
    month: "2-digit",
    year:  "numeric",
  });
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <TableCell key={i}>
          <div className="h-4 animate-pulse rounded bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerMetrics | null>(null);

  const { customers, isLoading, isError } = useCustomers();
  const { sales } = useSales();

  const filtered = query
    ? customers.filter((c) => {
        const q = normalize(query);
        return normalize(c.name).includes(q) || normalize(c.email).includes(q);
      })
    : customers;

  const totalActive = customers.filter((c) => c.totalLifetime > 0).length;

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Clientes</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Cargando…"
                  : `${customers.length} registrados · ${totalActive} con compras`}
              </p>
            </div>
          </div>
        </div>

        {/* ── Summary cards ── */}
        {!isLoading && !isError && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Total registrados
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
                {customers.length}
              </p>
            </Card>
            <Card className="px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Con al menos 1 compra
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
                {totalActive}
              </p>
            </Card>
            <Card className="px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Facturación total (lifetime)
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
                {fmt(customers.reduce((s, c) => s + c.totalLifetime, 0))}
              </p>
            </Card>
          </div>
        )}

        {/* ── Table card ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Listado de clientes</CardTitle>
                <CardDescription>
                  Clientes registrados · compras calculadas sobre ventas completadas
                </CardDescription>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 pr-7"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {query && !isLoading && (
              <p className="text-xs text-muted-foreground">
                {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para &quot;{query}&quot;
              </p>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {isError && (
              <p className="px-6 py-8 text-center text-sm text-destructive">
                No se pudo cargar la lista de clientes.
              </p>
            )}

            {!isError && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Registrado</TableHead>
                    <TableHead className="text-right">Este mes</TableHead>
                    <TableHead className="text-right">Últimos 6 meses</TableHead>
                    <TableHead className="pr-6 text-right">Total histórico</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                    : filtered.length === 0
                    ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                          {query ? "Sin resultados para la búsqueda." : "No hay clientes registrados aún."}
                        </TableCell>
                      </TableRow>
                    )
                    : filtered.map((c) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedCustomer(c)}
                      >
                        {/* Nombre + estado */}
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{c.name}</span>
                            {!c.emailVerified && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                Sin verificar
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Email */}
                        <TableCell className="text-sm text-muted-foreground">
                          {c.email}
                        </TableCell>

                        {/* Fecha de registro */}
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {fmtDate(c.createdAt)}
                        </TableCell>

                        {/* Compras este mes */}
                        <TableCell className="text-right">
                          <span className={cn(
                            "text-sm tabular-nums font-medium",
                            c.totalMonth > 0 ? "text-foreground" : "text-muted-foreground/50",
                          )}>
                            {c.totalMonth > 0 ? fmt(c.totalMonth) : "—"}
                          </span>
                        </TableCell>

                        {/* Compras semestre */}
                        <TableCell className="text-right">
                          <span className={cn(
                            "text-sm tabular-nums font-medium",
                            c.totalSemester > 0 ? "text-foreground" : "text-muted-foreground/50",
                          )}>
                            {c.totalSemester > 0 ? fmt(c.totalSemester) : "—"}
                          </span>
                        </TableCell>

                        {/* Total histórico */}
                        <TableCell className="pr-6 text-right">
                          <span className={cn(
                            "text-sm tabular-nums font-semibold",
                            c.totalLifetime > 0 ? "text-foreground" : "text-muted-foreground/40",
                          )}>
                            {c.totalLifetime > 0 ? fmt(c.totalLifetime) : "—"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      </div>

      <CustomerDetailSheet
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        sales={sales.filter((s) => s.userId === selectedCustomer?.id || s.customerEmail === selectedCustomer?.email)}
      />
    </main>
  );
}
