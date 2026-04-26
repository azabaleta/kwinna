"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  LayoutDashboard,
  Minus,
  Package2,
  RefreshCw,
  Repeat2,
  RotateCcw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Clock,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProducts } from "@/hooks/use-products";
import { useStock, useStockMovements } from "@/hooks/use-stock";
import { useSales } from "@/hooks/use-sale";
import { useAnalyticsSummary } from "@/hooks/use-analytics";
import { useReturnsSummary } from "@/hooks/use-returns";
import { cn } from "@/lib/utils";
import { RETURN_REASON_LABELS, type ReturnReason, type Sale, type Stock, type StockMovement } from "@kwinna/contracts";

// ─── Period helpers ───────────────────────────────────────────────────────────

type Period = "week" | "month" | "semester";

const PERIOD_LABELS: Record<Period, string> = {
  week:     "Semana",
  month:    "Mes",
  semester: "Semestre",
};

function startOfDay(d: Date) {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r;
}

function getRange(period: Period): [Date, Date] {
  const now = new Date();
  if (period === "week") {
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return [startOfDay(mon), new Date(mon.getTime() + 7 * 86_400_000)];
  }
  if (period === "month") {
    return [
      new Date(now.getFullYear(), now.getMonth(), 1),
      new Date(now.getFullYear(), now.getMonth() + 1, 1),
    ];
  }
  return [
    new Date(now.getFullYear(), now.getMonth() - 5, 1),
    new Date(now.getFullYear(), now.getMonth() + 1, 1),
  ];
}

function getPrevRange(period: Period): [Date, Date] {
  const [s, e] = getRange(period);
  const diff = e.getTime() - s.getTime();
  return [new Date(s.getTime() - diff), new Date(e.getTime() - diff)];
}

// ─── Metric computation ───────────────────────────────────────────────────────

interface Metrics {
  revenue:   number;
  orders:    number;
  units:     number;
  avgTicket: number;
  pending:   number;
  cancelled: number;
}

function computeMetrics(sales: Sale[], from: Date, to: Date): Metrics {
  const inRange   = sales.filter((s) => { const d = new Date(s.createdAt); return d >= from && d < to; });
  const completed = inRange.filter((s) => s.status === "completed");
  const revenue   = completed.reduce((sum, s) => sum + s.total, 0);
  const units     = completed.reduce((sum, s) => sum + s.items.reduce((si, i) => si + i.quantity, 0), 0);
  return {
    revenue,
    orders:    completed.length,
    units,
    avgTicket: completed.length > 0 ? revenue / completed.length : 0,
    pending:   inRange.filter((s) => s.status === "pending").length,
    cancelled: inRange.filter((s) => s.status === "cancelled").length,
  };
}

function topProducts(sales: Sale[], from: Date, to: Date, limit = 5) {
  const completed = sales.filter((s) => {
    const d = new Date(s.createdAt);
    return d >= from && d < to && s.status === "completed";
  });
  const map: Record<string, { productId: string; units: number; revenue: number }> = {};
  for (const sale of completed) {
    for (const item of sale.items) {
      const e = map[item.productId] ?? { productId: item.productId, units: 0, revenue: 0 };
      e.units += item.quantity; e.revenue += item.subtotal;
      map[item.productId] = e;
    }
  }
  return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

interface RetentionResult {
  rate:           number | null;
  returningCount: number;
  totalCount:     number;
}

/**
 * De todos los clientes que compraron (completed) en [from, to),
 * ¿cuántos ya habían comprado al menos una vez antes de `from`?
 * Identifica clientes por customerEmail.
 */
function computeRetention(sales: Sale[], from: Date, to: Date): RetentionResult {
  const completed  = sales.filter((s) => s.status === "completed");
  const inPeriod   = completed.filter((s) => { const d = new Date(s.createdAt); return d >= from && d < to; });

  if (inPeriod.length === 0) return { rate: null, returningCount: 0, totalCount: 0 };

  const uniqueInPeriod = new Set(inPeriod.map((s) => s.customerEmail));
  const beforePeriod   = new Set(
    completed
      .filter((s) => new Date(s.createdAt) < from)
      .map((s) => s.customerEmail),
  );

  const returningCount = [...uniqueInPeriod].filter((e) => beforePeriod.has(e)).length;
  const totalCount     = uniqueInPeriod.size;

  return { rate: (returningCount / totalCount) * 100, returningCount, totalCount };
}

// ─── Sell-Through Rate ────────────────────────────────────────────────────────
// Fórmula exacta: STR = Vendidas en período / Recibidas en período × 100
// Calculado POR VARIANTE (productId + size) usando los movimientos de stock "in".
// Solo se muestran variantes que tuvieron ingresos en el período — son las únicas
// para las que la métrica es significativa.
// Una variante con STR bajo (ej. XL de una blusa) es dead stock.

interface STRVariant {
  productId: string;
  size:      string | undefined;   // undefined = producto sin talle
  received:  number;
  sold:      number;
  onHand:    number;               // stock actual al momento del cálculo
  str:       number;               // 0–100
}

function computeSellThrough(
  sales:     Sale[],
  movements: StockMovement[],
  stock:     Stock[],
  from:      Date,
  to:        Date,
): STRVariant[] {
  // 1. Unidades RECIBIDAS por variante en el período (movimientos "in")
  //    Los movements ya vienen filtrados por tipo="in" y rango desde el hook.
  const receivedByVariant: Record<string, number> = {};
  movements.forEach((m) => {
    const key = `${m.productId}::${m.size ?? ""}`;
    receivedByVariant[key] = (receivedByVariant[key] ?? 0) + m.quantity;
  });

  // 2. Unidades VENDIDAS por variante en el período
  const soldByVariant: Record<string, number> = {};
  sales
    .filter((s) => {
      const d = new Date(s.createdAt);
      return d >= from && d < to && s.status === "completed";
    })
    .forEach((sale) => {
      sale.items.forEach((item) => {
        const key = `${item.productId}::${item.size ?? ""}`;
        soldByVariant[key] = (soldByVariant[key] ?? 0) + item.quantity;
      });
    });

  // 3. Stock ACTUAL por variante (para mostrar en tabla)
  const onHandByVariant: Record<string, number> = {};
  stock.forEach((s) => {
    const key = `${s.productId}::${s.size ?? ""}`;
    onHandByVariant[key] = s.quantity;
  });

  // 4. Solo variantes que tuvieron ingresos en el período
  return Object.entries(receivedByVariant)
    .map(([key, received]) => {
      const [productId, rawSize] = key.split("::");
      const size   = rawSize === "" ? undefined : rawSize;
      const sold   = soldByVariant[key]   ?? 0;
      const onHand = onHandByVariant[key] ?? 0;
      return {
        productId: productId!,
        size,
        received,
        sold,
        onHand,
        str: (sold / received) * 100,
      };
    })
    // Ordenar: primero las con STR más bajo (dead stock primero = más urgente)
    .sort((a, b) => a.str - b.str);
}

// ─── Inventory Turnover ───────────────────────────────────────────────────────
// Rotación = Unidades vendidas en el período / Stock actual total
// Indica cuántas veces se "renovó" todo el inventario.

function computeTurnover(sales: Sale[], stock: Stock[], from: Date, to: Date): number | null {
  const unitsSold = sales
    .filter((s) => { const d = new Date(s.createdAt); return d >= from && d < to && s.status === "completed"; })
    .reduce((sum, s) => sum + s.items.reduce((si, i) => si + i.quantity, 0), 0);
  const currentStock = stock.reduce((sum, s) => sum + s.quantity, 0);
  if (currentStock === 0) return unitsSold > 0 ? null : null;
  return unitsSold / currentStock;
}

function trendPct(current: number, previous: number) {
  if (previous === 0) return { pct: current > 0 ? 100 : 0, up: current >= 0 };
  const pct = ((current - previous) / previous) * 100;
  return { pct: Math.abs(pct), up: pct >= 0 };
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        <Minus className="h-3 w-3" /> —
      </span>
    );
  }
  const { pct, up } = trendPct(current, previous);
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
      up ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive",
    )}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {pct.toFixed(1)}%
    </span>
  );
}

interface MetricCardProps {
  title: string; value: string; description: string; icon: React.ElementType;
  current: number; previous: number; isLoading?: boolean;
  variant?: "default" | "warning" | "success";
}

function MetricCard({ title, value, description, icon: Icon, current, previous, isLoading, variant = "default" }: MetricCardProps) {
  const iconBg    = variant === "warning" ? "bg-amber-500/10" : variant === "success" ? "bg-emerald-500/10" : "bg-primary/10";
  const iconColor = variant === "warning" ? "text-amber-500"  : variant === "success" ? "text-emerald-600"  : "text-primary";
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <div className="flex items-end justify-between gap-2">
            <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
            <TrendBadge current={current} previous={previous} />
          </div>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function SmallStatCard({ title, value, icon: Icon, color, isLoading }: {
  title: string; value: number; icon: React.ElementType;
  color: "green" | "amber" | "muted"; isLoading?: boolean;
}) {
  const iconCls = color === "green" ? "text-emerald-600 bg-emerald-500/10" : color === "amber" ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground bg-muted";
  const valCls  = color === "green" ? "text-emerald-700" : color === "amber" ? "text-amber-600" : "text-muted-foreground";
  return (
    <Card className="flex flex-row items-center gap-4 px-5 py-4">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconCls)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        {isLoading
          ? <div className="mt-1 h-5 w-10 animate-pulse rounded bg-muted" />
          : <p className={cn("text-xl font-bold tabular-nums", valCls)}>{value}</p>
        }
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("month");

  const { products, isLoading: loadingProducts } = useProducts();
  const { stock,    isLoading: loadingStock    } = useStock();
  const { sales: rawSales, isLoading: loadingSales } = useSales();

  const sales = useMemo(() => rawSales.filter(s => !s.isDismissed), [rawSales]);

  const [from, to]         = useMemo(() => getRange(period),     [period]);
  const [prevFrom, prevTo] = useMemo(() => getPrevRange(period), [period]);

  const { movements, isLoading: loadingMovements } = useStockMovements(from, to);

  const isLoading = loadingProducts || loadingStock || loadingSales || loadingMovements;

  const { summary, isLoading: loadingAnalytics } = useAnalyticsSummary(from, to);
  const { summary: prevSummary }                 = useAnalyticsSummary(prevFrom, prevTo);

  const curr = useMemo(() => computeMetrics(sales, from, to),         [sales, from, to]);
  const prev = useMemo(() => computeMetrics(sales, prevFrom, prevTo), [sales, prevFrom, prevTo]);
  const top  = useMemo(() => topProducts(sales, from, to),            [sales, from, to]);

  const { totalStock, stockValue, criticalItems, outOfStockCount } = useMemo(() => {
    const productMap    = Object.fromEntries(products.map((p) => [p.id, p]));
    const qtyByProduct  = stock.reduce<Record<string, number>>((acc, s) => {
      acc[s.productId] = (acc[s.productId] ?? 0) + s.quantity; return acc;
    }, {});
    const totalStock      = Object.values(qtyByProduct).reduce((s, q) => s + q, 0);
    const outOfStockCount = products.filter((p) => (qtyByProduct[p.id] ?? 0) === 0).length;
    const stockValue      = stock.reduce((sum, s) => sum + (productMap[s.productId]?.price ?? 0) * s.quantity, 0);
    const criticalItems   = products
      .map((p) => ({ product: p, qty: qtyByProduct[p.id] ?? 0 }))
      .filter(({ qty }) => qty > 0 && qty < 5)
      .sort((a, b) => a.qty - b.qty);
    return { totalStock, stockValue, criticalItems, outOfStockCount };
  }, [products, stock]);

  const productName = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.name])), [products]);

  const conversionRate     = summary.shopViews > 0       ? (curr.orders / summary.shopViews) * 100 : null;
  const prevConversionRate = prevSummary.shopViews > 0   ? (prev.orders / prevSummary.shopViews) * 100 : null;
  const abandonmentRate    = summary.checkoutStarts > 0  ? ((summary.checkoutStarts - summary.saleCompletes) / summary.checkoutStarts) * 100 : null;
  const prevAbandonmentRate = prevSummary.checkoutStarts > 0 ? ((prevSummary.checkoutStarts - prevSummary.saleCompletes) / prevSummary.checkoutStarts) * 100 : null;

  const retention     = useMemo(() => computeRetention(sales, from, to),         [sales, from, to]);
  const prevRetention = useMemo(() => computeRetention(sales, prevFrom, prevTo), [sales, prevFrom, prevTo]);

  const strEntries  = useMemo(() => computeSellThrough(sales, movements, stock, from, to), [sales, movements, stock, from, to]);
  const avgSTR      = strEntries.length > 0 ? strEntries.reduce((s, e) => s + e.str, 0) / strEntries.length : null;
  const turnover    = useMemo(() => computeTurnover(sales, stock, from, to),    [sales, stock, from, to]);
  const prevTurnover = useMemo(() => computeTurnover(sales, stock, prevFrom, prevTo), [sales, stock, prevFrom, prevTo]);

  const { summary: returnsSummary, isLoading: loadingReturns } = useReturnsSummary(from, to);
  const { summary: prevReturnsSummary }                        = useReturnsSummary(prevFrom, prevTo);

  // Returns rate: devueltas / unidades vendidas × 100
  const returnsRate     = curr.units > 0      ? (returnsSummary.total / curr.units) * 100      : null;
  const prevReturnsRate = prev.units > 0 ? (prevReturnsSummary.total / prev.units) * 100 : null;

  const fmt  = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
  const fmtN = (n: number) => n.toLocaleString("es-AR");
  const today = new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-8">

        {/* ── Header + selector de período ─────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm capitalize text-muted-foreground">{today}</p>
            </div>
          </div>

          {/* Selector global de período — controla todas las secciones */}
          <div className="flex gap-1 self-start rounded-lg border border-border bg-muted/40 p-1 sm:self-auto">
            {(["week", "month", "semester"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-all",
                  period === p
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            MÉTRICAS CLAVE (CR · AOV · ABANDONO)
        ════════════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Métricas clave
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* Tasa de Conversión */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Conversión</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading || loadingAnalytics ? (
                  <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                ) : conversionRate === null ? (
                  <p className="text-2xl font-bold text-muted-foreground">—</p>
                ) : (
                  <div className="flex items-end justify-between gap-2">
                    <p className="text-2xl font-bold tabular-nums text-foreground">{conversionRate.toFixed(1)}%</p>
                    {prevConversionRate !== null && <TrendBadge current={conversionRate} previous={prevConversionRate} />}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary.shopViews > 0 ? `${curr.orders} ventas / ${summary.shopViews} visitas únicas` : "Sin datos de visitas aún"}
                </p>
              </CardContent>
            </Card>

            {/* AOV */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Promedio (AOV)</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <BadgeDollarSign className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                ) : curr.orders === 0 ? (
                  <p className="text-2xl font-bold text-muted-foreground">—</p>
                ) : (
                  <div className="flex items-end justify-between gap-2">
                    <p className="text-2xl font-bold tabular-nums text-foreground">{fmt(curr.avgTicket)}</p>
                    <TrendBadge current={curr.avgTicket} previous={prev.avgTicket} />
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">Monto promedio por orden completada</p>
              </CardContent>
            </Card>

            {/* Abandono */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Abandono de Carrito</CardTitle>
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", abandonmentRate !== null && abandonmentRate > 70 ? "bg-destructive/10" : "bg-amber-500/10")}>
                  <TrendingDown className={cn("h-4 w-4", abandonmentRate !== null && abandonmentRate > 70 ? "text-destructive" : "text-amber-500")} />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading || loadingAnalytics ? (
                  <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                ) : abandonmentRate === null ? (
                  <p className="text-2xl font-bold text-muted-foreground">—</p>
                ) : (
                  <div className="flex items-end justify-between gap-2">
                    <p className={cn("text-2xl font-bold tabular-nums", abandonmentRate > 70 ? "text-destructive" : "text-amber-500")}>
                      {abandonmentRate.toFixed(1)}%
                    </p>
                    {prevAbandonmentRate !== null && <TrendBadge current={prevAbandonmentRate} previous={abandonmentRate} />}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary.checkoutStarts > 0 ? `${summary.checkoutStarts - summary.saleCompletes} de ${summary.checkoutStarts} no compraron` : "Sin checkouts registrados aún"}
                </p>
              </CardContent>
            </Card>


            {/* Retención */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Recurrentes</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                  <Repeat2 className="h-4 w-4 text-violet-600" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                ) : retention.rate === null ? (
                  <p className="text-2xl font-bold text-muted-foreground">—</p>
                ) : (
                  <div className="flex items-end justify-between gap-2">
                    <p className="text-2xl font-bold tabular-nums text-foreground">
                      {retention.rate.toFixed(1)}%
                    </p>
                    {prevRetention.rate !== null && (
                      <TrendBadge current={retention.rate} previous={prevRetention.rate} />
                    )}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {retention.totalCount > 0
                    ? `${retention.returningCount} de ${retention.totalCount} clientes ya habían comprado`
                    : "Sin ventas en este período"}
                </p>
              </CardContent>
            </Card>

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            VENTAS
        ════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Ventas · {PERIOD_LABELS[period]}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Ingresos"      value={fmt(curr.revenue)}                       description={`vs. ${PERIOD_LABELS[period].toLowerCase()} anterior`} icon={BadgeDollarSign} current={curr.revenue}   previous={prev.revenue}   isLoading={isLoading} variant="success" />
            <MetricCard title="Órdenes"       value={fmtN(curr.orders)}                       description="Ventas completadas"                                    icon={ShoppingBag}    current={curr.orders}    previous={prev.orders}    isLoading={isLoading} />
            <MetricCard title="Ticket promedio" value={curr.orders > 0 ? fmt(curr.avgTicket) : "—"} description="Por orden completada"                          icon={BarChart3}      current={curr.avgTicket} previous={prev.avgTicket} isLoading={isLoading} />
            <MetricCard title="Unidades"      value={fmtN(curr.units)}                        description="Prendas vendidas"                                      icon={TrendingUp}     current={curr.units}     previous={prev.units}     isLoading={isLoading} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SmallStatCard title="Completadas" value={curr.orders}    icon={ShoppingBag} color="green" isLoading={isLoading} />
            <SmallStatCard title="Pendientes"  value={curr.pending}   icon={Clock}       color="amber" isLoading={isLoading} />
            <SmallStatCard title="Canceladas"  value={curr.cancelled} icon={XCircle}     color="muted" isLoading={isLoading} />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            TOP PRODUCTOS + INVENTARIO
        ════════════════════════════════════════════════════════════════ */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Top productos · {PERIOD_LABELS[period]}
            </h2>
            <Card>
              {isLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                      <div className="flex-1 h-4 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              ) : top.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">Sin ventas en este período</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {top.map((item, i) => (
                    <div key={item.productId} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-5 shrink-0 text-center text-[11px] font-bold text-muted-foreground/50">{i + 1}</span>
                      <p className="flex-1 truncate text-sm font-medium text-foreground">
                        {productName[item.productId] ?? item.productId.slice(0, 8) + "…"}
                      </p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{item.units} UN</span>
                      <span className="shrink-0 w-24 text-right text-sm font-semibold tabular-nums text-foreground">{fmt(item.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Inventario</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Card className="px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Productos</p>
                  {isLoading ? <div className="mt-1 h-6 w-10 animate-pulse rounded bg-muted" /> : <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{products.length}</p>}
                </Card>
                <Card className="px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Unidades</p>
                  {isLoading ? <div className="mt-1 h-6 w-10 animate-pulse rounded bg-muted" /> : <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{fmtN(totalStock)}</p>}
                </Card>
              </div>
              <Card className="px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Valor del inventario</p>
                {isLoading ? <div className="mt-1 h-6 w-24 animate-pulse rounded bg-muted" /> : <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{fmt(stockValue)}</p>}
              </Card>
              <div className="grid grid-cols-2 gap-3">
                <Card className="px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Sin stock</p>
                  {isLoading ? <div className="mt-1 h-6 w-8 animate-pulse rounded bg-muted" /> : <p className={cn("mt-0.5 text-xl font-bold tabular-nums", outOfStockCount > 0 ? "text-destructive" : "text-foreground")}>{outOfStockCount}</p>}
                </Card>
                <Card className="px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Crítico <span className="normal-case font-normal">({"<"}5)</span></p>
                  {isLoading ? <div className="mt-1 h-6 w-8 animate-pulse rounded bg-muted" /> : <p className={cn("mt-0.5 text-xl font-bold tabular-nums", criticalItems.length > 0 ? "text-amber-500" : "text-foreground")}>{criticalItems.length}</p>}
                </Card>
              </div>
              {!isLoading && criticalItems.length > 0 && (
                <Card>
                  <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">Reposición urgente</p>
                  </div>
                  <div className="divide-y divide-border">
                    {criticalItems.map(({ product, qty }) => (
                      <div key={product.id} className="flex items-center justify-between px-4 py-2">
                        <p className="truncate text-xs text-foreground">{product.name}</p>
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", qty <= 2 ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600")}>
                          {qty} UN
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </section>

        </div>

        {/* ═══════════════════════════════════════════════════════════════
            ANÁLISIS DE INVENTARIO (STR + Rotación)
        ════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Análisis de Inventario · {PERIOD_LABELS[period]}
          </h2>

          {/* ── Métricas globales ── */}
          <div className="grid gap-4 sm:grid-cols-3">

            {/* Rotación */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rotación de Inventario</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10">
                  <RefreshCw className="h-4 w-4 text-sky-600" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                ) : turnover === null ? (
                  <p className="text-2xl font-bold text-muted-foreground">—</p>
                ) : (
                  <div className="flex items-end justify-between gap-2">
                    <p className="text-2xl font-bold tabular-nums text-foreground">
                      {turnover.toFixed(1)}<span className="ml-1 text-base font-normal text-muted-foreground">x</span>
                    </p>
                    {prevTurnover !== null && (
                      <TrendBadge current={turnover} previous={prevTurnover} />
                    )}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Unidades vendidas ÷ stock actual — cuántas veces se renovó el inventario
                </p>
              </CardContent>
            </Card>

            {/* STR promedio */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sell-Through Rate</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                ) : avgSTR === null ? (
                  <p className="text-2xl font-bold text-muted-foreground">—</p>
                ) : (
                  <p className="text-2xl font-bold tabular-nums text-foreground">
                    {avgSTR.toFixed(1)}<span className="ml-0.5 text-base font-normal text-muted-foreground">%</span>
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Promedio entre todos los productos · vendido ÷ (vendido + stock)
                </p>
              </CardContent>
            </Card>

            {/* Pérdidas por devoluciones */}
            <Card className={cn(
              returnsSummary.lostValue > 0 && "border-destructive/30",
            )}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pérdidas por Devoluciones</CardTitle>
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  returnsSummary.lostValue > 0 ? "bg-destructive/10" : "bg-muted",
                )}>
                  <RotateCcw className={cn(
                    "h-4 w-4",
                    returnsSummary.lostValue > 0 ? "text-destructive" : "text-muted-foreground",
                  )} />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading || loadingReturns ? (
                  <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                ) : (
                  <>
                    <p className={cn(
                      "text-2xl font-bold tabular-nums",
                      returnsSummary.lostValue > 0 ? "text-destructive" : "text-foreground",
                    )}>
                      ${returnsSummary.lostValue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {returnsSummary.lostQuantity > 0
                        ? `${returnsSummary.lostQuantity} ${returnsSummary.lostQuantity === 1 ? "prenda" : "prendas"} no recuperadas`
                        : "Sin pérdidas en este período"}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── STR por variante ── */}
          {!isLoading && strEntries.length > 0 && (
            <Card>
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Package2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Sell-Through por variante
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground/60">
                  ordenado de menor a mayor · dead stock primero
                </p>
              </div>

              {/* Header */}
              <div className="grid grid-cols-[1fr_48px_56px_56px_80px_56px] gap-x-3 border-b border-border/50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                <span>Producto</span>
                <span className="text-center">Talle</span>
                <span className="text-right">Recib.</span>
                <span className="text-right">Vend.</span>
                <span>STR</span>
                <span className="text-right">Stock</span>
              </div>

              <div className="divide-y divide-border/50">
                {strEntries.slice(0, 15).map(({ productId, size, received, sold, onHand, str }) => {
                  const isDeadStock = str < 20;
                  const barColor =
                    str >= 70 ? "bg-emerald-500" :
                    str >= 40 ? "bg-amber-400"   :
                                "bg-red-400";
                  const textColor =
                    str >= 70 ? "text-emerald-700" :
                    str >= 40 ? "text-amber-600"   :
                                "text-red-600";
                  const rowKey = `${productId}::${size ?? ""}`;

                  return (
                    <div
                      key={rowKey}
                      className={cn(
                        "grid grid-cols-[1fr_48px_56px_56px_80px_56px] items-center gap-x-3 px-4 py-2.5",
                        isDeadStock && "bg-red-50/50 dark:bg-red-950/20",
                      )}
                    >
                      {/* Producto */}
                      <div className="min-w-0 flex items-center gap-1.5">
                        {isDeadStock && (
                          <span className="shrink-0 rounded bg-red-100 px-1 py-px text-[9px] font-bold uppercase text-red-600 dark:bg-red-900/40">
                            Dead
                          </span>
                        )}
                        <p className="truncate text-sm font-medium text-foreground">
                          {productName[productId] ?? productId.slice(0, 8) + "…"}
                        </p>
                      </div>

                      {/* Talle */}
                      <div className="text-center">
                        {size ? (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {size}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/40">—</span>
                        )}
                      </div>

                      {/* Recibidas */}
                      <p className="text-right text-[11px] tabular-nums text-muted-foreground">
                        {received}
                      </p>

                      {/* Vendidas */}
                      <p className="text-right text-[11px] tabular-nums text-muted-foreground">
                        {sold}
                      </p>

                      {/* Barra STR */}
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full transition-all", barColor)}
                            style={{ width: `${Math.min(str, 100)}%` }}
                          />
                        </div>
                        <span className={cn("w-8 shrink-0 text-right text-[11px] font-semibold tabular-nums", textColor)}>
                          {str.toFixed(0)}%
                        </span>
                      </div>

                      {/* Stock actual */}
                      <p className={cn(
                        "text-right text-[11px] tabular-nums font-medium",
                        onHand === 0 ? "text-muted-foreground/40" : "text-foreground",
                      )}>
                        {onHand}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            DEVOLUCIONES
        ════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Devoluciones · {PERIOD_LABELS[period]}
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">

            {/* Tasa de devolución */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Devoluciones</CardTitle>
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  returnsRate !== null && returnsRate > 10 ? "bg-destructive/10" : "bg-orange-500/10",
                )}>
                  <RotateCcw className={cn(
                    "h-4 w-4",
                    returnsRate !== null && returnsRate > 10 ? "text-destructive" : "text-orange-500",
                  )} />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading || loadingReturns ? (
                  <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                ) : returnsRate === null ? (
                  <p className="text-2xl font-bold text-muted-foreground">—</p>
                ) : (
                  <div className="flex items-end justify-between gap-2">
                    <p className={cn(
                      "text-2xl font-bold tabular-nums",
                      returnsRate > 10 ? "text-destructive" : "text-foreground",
                    )}>
                      {returnsRate.toFixed(1)}%
                    </p>
                    {prevReturnsRate !== null && (
                      <TrendBadge current={prevReturnsRate} previous={returnsRate} />
                    )}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {curr.units > 0
                    ? `${returnsSummary.total} devoluciones / ${curr.units} unidades vendidas`
                    : "Sin ventas en este período"}
                </p>
              </CardContent>
            </Card>

            {/* Total devueltas */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unidades Devueltas</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Package2 className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {loadingReturns ? (
                  <div className="h-8 w-12 animate-pulse rounded bg-muted" />
                ) : (
                  <p className="text-2xl font-bold tabular-nums text-foreground">
                    {returnsSummary.total}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">Prendas registradas como devolución</p>
              </CardContent>
            </Card>

            {/* Motivo principal */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Motivo Principal</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {loadingReturns ? (
                  <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                ) : returnsSummary.total === 0 ? (
                  <p className="text-2xl font-bold text-muted-foreground">—</p>
                ) : (() => {
                    const top = (Object.entries(returnsSummary.byReason) as [ReturnReason, number][])
                      .sort((a, b) => b[1] - a[1])[0];
                    return (
                      <p className="text-2xl font-bold text-foreground">
                        {top ? RETURN_REASON_LABELS[top[0]] : "—"}
                      </p>
                    );
                  })()
                }
                <p className="mt-1 text-xs text-muted-foreground">Razón más frecuente de devolución</p>
              </CardContent>
            </Card>
          </div>

          {/* ── Desglose por motivo ── */}
          {!loadingReturns && returnsSummary.total > 0 && (
            <Card>
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Desglose por motivo
                </p>
              </div>
              <div className="divide-y divide-border">
                {(Object.entries(returnsSummary.byReason) as [ReturnReason, number][])
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => {
                    const pct = returnsSummary.total > 0 ? (count / returnsSummary.total) * 100 : 0;
                    return (
                      <div key={reason} className="flex items-center gap-3 px-4 py-3">
                        <p className="w-40 shrink-0 text-sm text-foreground">
                          {RETURN_REASON_LABELS[reason]}
                        </p>
                        <div className="flex flex-1 items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-orange-400 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                            {count}
                          </span>
                          <span className="w-10 shrink-0 text-right text-[11px] font-semibold tabular-nums text-foreground">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            AGOTADOS
        ════════════════════════════════════════════════════════════════ */}
        {!isLoading && outOfStockCount > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Sin stock</h2>
            <Card>
              <div className="divide-y divide-border">
                {products.filter((p) => stock.filter((s) => s.productId === p.id).reduce((sum, s) => sum + s.quantity, 0) === 0).map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-sm text-foreground">{p.name}</p>
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">AGOTADO</span>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        )}

      </div>
    </main>
  );
}
