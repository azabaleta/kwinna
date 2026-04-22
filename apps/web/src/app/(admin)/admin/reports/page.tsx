"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  HardDriveUpload,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import type { MetricSnapshot, SnapshotPeriod } from "@kwinna/contracts";
import { RETURN_REASON_LABELS, type ReturnReason } from "@kwinna/contracts";
import { Badge }    from "@/components/ui/badge";
import { Button }   from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSnapshots, useGenerateSnapshot, useDeleteSnapshot } from "@/hooks/use-reports";
import { snapshotToCsv, downloadCsv, exportSnapshotToDrive } from "@/services/reports";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtARS(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }

// Devuelve sugerencias de rango para el selector rápido
function quickRanges() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const isoDate = (d: Date) => d.toISOString().slice(0, 10);

  const startOfMonth = (y: number, m: number) => new Date(y, m, 1);
  const endOfMonth   = (y: number, m: number) => new Date(y, m + 1, 0, 23, 59, 59, 999);

  const MONTHS_ES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const months = [];
  for (let i = 0; i < 6; i++) {
    const m = (month - i + 12) % 12;
    const y = month - i < 0 ? year - 1 : year;
    months.push({
      label:    `${MONTHS_ES[m]} ${y}`,
      period:   "monthly" as SnapshotPeriod,
      dateFrom: isoDate(startOfMonth(y, m)) + "T00:00:00.000Z",
      dateTo:   isoDate(endOfMonth(y, m))   + "T23:59:59.999Z",
    });
  }

  // Semestres del año actual
  const semesters = [
    {
      label:    `1er semestre ${year}`,
      period:   "semestral" as SnapshotPeriod,
      dateFrom: `${year}-01-01T00:00:00.000Z`,
      dateTo:   `${year}-06-30T23:59:59.999Z`,
    },
    {
      label:    `2do semestre ${year}`,
      period:   "semestral" as SnapshotPeriod,
      dateFrom: `${year}-07-01T00:00:00.000Z`,
      dateTo:   `${year}-12-31T23:59:59.999Z`,
    },
    {
      label:    `Año completo ${year}`,
      period:   "semestral" as SnapshotPeriod,
      dateFrom: `${year}-01-01T00:00:00.000Z`,
      dateTo:   `${year}-12-31T23:59:59.999Z`,
    },
  ];

  return { months, semesters };
}

// ─── Generate dialog ──────────────────────────────────────────────────────────

function GenerateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { months, semesters } = quickRanges();
  const { mutateAsync, isPending } = useGenerateSnapshot();

  const [label,    setLabel]    = useState("");
  const [period,   setPeriod]   = useState<SnapshotPeriod>("monthly");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  function applyQuick(q: { label: string; period: SnapshotPeriod; dateFrom: string; dateTo: string }) {
    setLabel(q.label);
    setPeriod(q.period);
    setDateFrom(q.dateFrom.slice(0, 10));
    setDateTo(q.dateTo.slice(0, 10));
  }

  function handleClose() {
    setLabel(""); setPeriod("monthly"); setDateFrom(""); setDateTo("");
    onClose();
  }

  async function handleGenerate() {
    if (!label || !dateFrom || !dateTo) {
      toast.error("Completá todos los campos");
      return;
    }
    try {
      await mutateAsync({
        period,
        label,
        dateFrom: new Date(dateFrom).toISOString(),
        dateTo:   new Date(dateTo + "T23:59:59.999Z").toISOString(),
      });
      toast.success("Reporte generado correctamente");
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al generar el reporte");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Generar reporte
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Quick selectors */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Períodos rápidos — Mensuales
            </p>
            <div className="flex flex-wrap gap-1.5">
              {months.map((q) => (
                <button
                  key={q.label}
                  onClick={() => applyQuick(q)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    label === q.label
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-2">
              Semestrales / Anuales
            </p>
            <div className="flex flex-wrap gap-1.5">
              {semesters.map((q) => (
                <button
                  key={q.label}
                  onClick={() => applyQuick(q)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    label === q.label
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <p className="text-xs text-muted-foreground">O definí un rango personalizado:</p>

            <div className="space-y-1.5">
              <Label>Etiqueta del reporte</Label>
              <Input
                placeholder="Ej: Enero 2025"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Desde</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hasta</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de período</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as SnapshotPeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="semestral">Semestral / Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isPending} className="gap-2">
            {isPending ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Calculando…</>
            ) : (
              <><BarChart3 className="h-4 w-4" /> Generar</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Snapshot card ────────────────────────────────────────────────────────────

function SnapshotCard({ snapshot }: { snapshot: MetricSnapshot }) {
  const [expanded,     setExpanded]     = useState(false);
  const [driveLink,    setDriveLink]    = useState<string | null>(null);
  const [driveLoading, setDriveLoading] = useState(false);
  const { mutateAsync: del, isPending: deleting } = useDeleteSnapshot();

  const d = snapshot.data;

  async function handleDelete() {
    if (!confirm(`¿Eliminar el reporte "${snapshot.label}"? Esta acción no se puede deshacer.`)) return;
    try {
      await del(snapshot.id);
      toast.success("Reporte eliminado");
    } catch {
      toast.error("Error al eliminar el reporte");
    }
  }

  function handleDownload() {
    const csv      = snapshotToCsv(snapshot);
    const filename = `kwinna_reporte_${snapshot.label.toLowerCase().replace(/\s+/g, "_")}.csv`;
    downloadCsv(csv, filename);
    toast.success("CSV descargado");
  }

  async function handleExportDrive() {
    setDriveLoading(true);
    try {
      const result = await exportSnapshotToDrive(snapshot.id);
      setDriveLink(result.webViewLink);
      toast.success("Exportado a Google Drive", {
        description: "El archivo quedó en tu carpeta de reportes.",
        action: { label: "Abrir", onClick: () => window.open(result.webViewLink, "_blank") },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al exportar a Drive");
    } finally {
      setDriveLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      {/* ── Header row ── */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{snapshot.label}</h3>
            <Badge variant="outline" className="text-[10px]">
              {snapshot.period === "monthly" ? "Mensual" : "Semestral"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            {fmtDate(snapshot.dateFrom)} – {fmtDate(snapshot.dateTo)}
            <span className="opacity-50">·</span>
            Generado {fmtDate(snapshot.createdAt)}
          </p>
        </div>

        {/* KPI pills */}
        <div className="hidden sm:flex items-center gap-3 text-right">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ventas</p>
            <p className="font-bold tabular-nums">{d.sales.count}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ingresos</p>
            <p className="font-bold tabular-nums text-emerald-600">{fmtARS(d.sales.revenue)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Conv.</p>
            <p className="font-bold tabular-nums">{fmtPct(d.conversion.conversionRate)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          {driveLink ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
              asChild
            >
              <a href={driveLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Drive
              </a>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExportDrive}
              disabled={driveLoading}
            >
              {driveLoading
                ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Subiendo…</>
                : <><HardDriveUpload className="h-3.5 w-3.5" /> Drive</>
              }
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="border-t border-border px-5 py-5 space-y-6">

          {/* Sales grid */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Ventas
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiBox label="Total" value={String(d.sales.count)} />
              <KpiBox label="Web" value={String(d.sales.countWeb)} />
              <KpiBox label="POS" value={String(d.sales.countPos)} />
              <KpiBox label="Ticket promedio" value={fmtARS(d.sales.avgOrderValue)} />
              <KpiBox label="Ingresos totales" value={fmtARS(d.sales.revenue)} accent="emerald" span={2} />
              <KpiBox label="Ingresos web"     value={fmtARS(d.sales.revenueWeb)} />
              <KpiBox label="Ingresos POS"     value={fmtARS(d.sales.revenuePos)} />
              <KpiBox label="Envíos"           value={fmtARS(d.sales.shippingRevenue)} />
            </div>

            {/* Top products table */}
            {d.sales.topProducts.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Top {d.sales.topProducts.length} productos más vendidos</p>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Producto</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Uds.</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.sales.topProducts.map((p, i) => (
                        <tr key={p.productId} className="border-t">
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{p.name}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{p.units}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{fmtARS(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Conversion */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Conversión web
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KpiBox label="Vistas de tienda"    value={String(d.conversion.shopViews)} />
              <KpiBox label="Adds al carrito"     value={String(d.conversion.cartAdds)} />
              <KpiBox label="Inicios checkout"    value={String(d.conversion.checkoutStarts)} />
              <KpiBox label="Ventas completadas"  value={String(d.conversion.salesCompleted)} />
              <KpiBox label="Tasa de conversión"  value={fmtPct(d.conversion.conversionRate)} accent="emerald" />
              <KpiBox label="Abandono carrito"    value={fmtPct(d.conversion.cartAbandonmentRate)} accent="red" />
            </div>
          </section>

          {/* Returns */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Devoluciones
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KpiBox label="Total devoluciones"      value={String(d.returns.count)} />
              <KpiBox label="Uds. no recuperadas"     value={String(d.returns.lostQuantity)} accent={d.returns.lostQuantity > 0 ? "red" : undefined} />
              <KpiBox label="Pérdida económica"       value={fmtARS(d.returns.lostValue)} accent={d.returns.lostValue > 0 ? "red" : undefined} />
            </div>
            {d.returns.count > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.entries(d.returns.byReason) as [ReturnReason, number][])
                  .filter(([, v]) => v > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <div key={reason} className="flex items-center gap-1.5 text-xs rounded-full border px-2.5 py-1">
                      <span className="text-muted-foreground">{RETURN_REASON_LABELS[reason]}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* Critical stock */}
          {d.stock.criticalItems.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Stock crítico al momento del reporte
              </h4>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Producto</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Talle</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.stock.criticalItems.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.size ?? "—"}</td>
                        <td className={cn(
                          "px-3 py-2 text-right font-semibold tabular-nums",
                          item.quantity === 0 ? "text-destructive" : "text-amber-600"
                        )}>
                          {item.quantity === 0 ? "Sin stock" : item.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── KpiBox ───────────────────────────────────────────────────────────────────

function KpiBox({
  label, value, accent, span,
}: {
  label:   string;
  value:   string;
  accent?: "emerald" | "red";
  span?:   number;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card px-3 py-2.5",
        span === 2 && "col-span-2"
      )}
    >
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn(
        "text-lg font-bold tabular-nums mt-0.5",
        accent === "emerald" && "text-emerald-600",
        accent === "red"     && "text-destructive",
      )}>
        {value}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { snapshots, isLoading, isError, refetch } = useSnapshots();

  const monthly   = snapshots.filter((s) => s.period === "monthly");
  const semestral = snapshots.filter((s) => s.period === "semestral");

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Reportes</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Cargando…" : `${snapshots.length} reportes guardados`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" /> Actualizar
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Nuevo reporte
            </Button>
          </div>
        </div>

        {isError && (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardContent className="pt-4 text-sm text-destructive">
              No se pudieron cargar los reportes.
            </CardContent>
          </Card>
        )}

        {/* Semestral / Anual */}
        {!isLoading && semestral.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Semestrales / Anuales
            </h2>
            {semestral.map((s) => <SnapshotCard key={s.id} snapshot={s} />)}
          </section>
        )}

        {/* Monthly */}
        {!isLoading && monthly.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Mensuales
            </h2>
            {monthly.map((s) => <SnapshotCard key={s.id} snapshot={s} />)}
          </section>
        )}

        {/* Empty state */}
        {!isLoading && !isError && snapshots.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sin reportes guardados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Generá tu primer reporte seleccionando un período. Los reportes capturan
                ventas, devoluciones, conversión y stock crítico en un snapshot inmutable.
              </p>
              <Button className="gap-2" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" /> Generar primer reporte
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

      </div>

      <GenerateDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </main>
  );
}
