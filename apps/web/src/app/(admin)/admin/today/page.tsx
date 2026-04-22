"use client";

import { useMemo } from "react";
import {
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import type { Sale } from "@kwinna/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSales } from "@/hooks/use-sale";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth()    === now.getMonth()    &&
    d.getDate()     === now.getDate()
  );
}

function fmtTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-AR", {
    hour:   "2-digit",
    minute: "2-digit",
  });
}

function fmtARS(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Sale["status"] }) {
  if (status === "completed") {
    return (
      <Badge className="gap-1 bg-green-500 text-white hover:bg-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Pagado
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge variant="outline" className="gap-1 border-amber-400 text-amber-600">
        <Clock className="h-3 w-3" />
        Pendiente
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" />
      Cancelado
    </Badge>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label:    string;
  value:    string | number;
  sub?:     string;
  icon:     React.ElementType;
  accent?:  "green" | "amber" | "red" | "blue";
}

function MetricCard({ label, value, sub, icon: Icon, accent = "blue" }: MetricCardProps) {
  const colors: Record<string, string> = {
    green: "bg-green-500/10 text-green-600",
    amber: "bg-amber-500/10 text-amber-600",
    red:   "bg-red-500/10 text-red-600",
    blue:  "bg-primary/10 text-primary",
  };
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {value}
            </p>
            {sub && (
              <p className="text-xs text-muted-foreground">{sub}</p>
            )}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors[accent]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableCell key={i}>
          <div className="h-4 animate-pulse rounded bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const { sales, isLoading, isError, refetch } = useSales();

  const todaySales = useMemo(
    () => sales
      .filter((s) => isToday(s.createdAt))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [sales]
  );

  const completed  = todaySales.filter((s) => s.status === "completed");
  const pending    = todaySales.filter((s) => s.status === "pending");
  const cancelled  = todaySales.filter((s) => s.status === "cancelled");

  const revenue    = completed.reduce((acc, s) => acc + s.total, 0);
  const units      = completed.reduce(
    (acc, s) => acc + s.items.reduce((a, i) => a + i.quantity, 0),
    0
  );
  const aov        = completed.length > 0 ? revenue / completed.length : 0;

  const todayLabel = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
  });

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CalendarCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold capitalize text-foreground">
                Pedidos del día
              </h1>
              <p className="text-sm capitalize text-muted-foreground">{todayLabel}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </Button>
        </div>

        {/* ── Financial metrics ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Ingresos del día"
            value={fmtARS(revenue)}
            sub="Solo órdenes pagadas"
            icon={DollarSign}
            accent="green"
          />
          <MetricCard
            label="Ticket promedio"
            value={completed.length > 0 ? fmtARS(Math.round(aov)) : "—"}
            sub="Sobre órdenes completadas"
            icon={ArrowUpRight}
            accent="blue"
          />
          <MetricCard
            label="Unidades vendidas"
            value={units}
            sub="En órdenes completadas"
            icon={Package}
            accent="blue"
          />
        </div>

        {/* ── Order status metrics ── */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total de órdenes"
            value={todaySales.length}
            sub="Hoy"
            icon={ShoppingBag}
            accent="blue"
          />
          <MetricCard
            label="Completadas"
            value={completed.length}
            sub="Pagadas exitosamente"
            icon={CheckCircle2}
            accent="green"
          />
          <MetricCard
            label="Pendientes"
            value={pending.length}
            sub="Stock ya reservado"
            icon={Clock}
            accent="amber"
          />
          <MetricCard
            label="Canceladas"
            value={cancelled.length}
            sub="Stock restaurado"
            icon={XCircle}
            accent="red"
          />
        </div>

        {/* ── Error state ── */}
        {isError && (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">
                No se pudieron cargar las ventas. Verificá que la API esté corriendo en el puerto 3001.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Orders table ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Órdenes de hoy</CardTitle>
            <CardDescription>
              {isLoading
                ? "Cargando…"
                : todaySales.length === 0
                  ? "Aún no hay pedidos hoy."
                  : `${todaySales.length} ${todaySales.length === 1 ? "orden" : "órdenes"} · ${completed.length} pagadas · ${pending.length} pendientes`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Piezas</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="pr-6 text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
                ) : todaySales.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Ningún pedido registrado por ahora. Actualizá para ver novedades.
                    </TableCell>
                  </TableRow>
                ) : (
                  todaySales.map((sale) => {
                    const totalUnits = sale.items.reduce((a, i) => a + i.quantity, 0);
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="pl-6">
                          <span className="font-mono text-sm tabular-nums text-muted-foreground">
                            {fmtTime(sale.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-foreground">
                            {sale.customerName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {sale.shippingCity}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {totalUnits}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {fmtARS(sale.total)}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <StatusBadge status={sale.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </main>
  );
}
