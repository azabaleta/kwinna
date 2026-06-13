"use client";

import { useMemo } from "react";
import {
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  Printer,
  RefreshCw,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import type { Product, Sale } from "@kwinna/contracts";
import { isPaidSale } from "@kwinna/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useState } from "react";
import { OrderDetailDialog } from "@/components/admin/order-detail-dialog";
import { useReceiptPrinter } from "@/components/admin/use-receipt-printer";
import { useProducts } from "@/hooks/use-products";
import { useSales, useCancelSale, useDismissSale, useUpdateSaleStatus, useReconcileSale, useApproveTransfer } from "@/hooks/use-sale";

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

function StatusBadge({ status, channel }: { status: Sale["status"]; channel?: Sale["channel"] }) {
  if (status === "delivered") {
    return (
      <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        Entregado
      </Badge>
    );
  }
  if (status === "assembled") {
    return (
      <Badge className="gap-1 bg-blue-500 text-white hover:bg-blue-600">
        <Package className="h-3 w-3" />
        Armado
      </Badge>
    );
  }
  if (status === "completed") {
    if (channel === "web") {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Badge className="gap-1 bg-green-500 text-white hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Pagado
          </Badge>
          <Badge variant="outline" className="border-amber-400 text-amber-600">Para armar</Badge>
        </span>
      );
    }
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
  const [dialogSale, setDialogSale] = useState<Sale | null>(null);

  const { sales, isLoading, isError, refetch } = useSales();
  const { products } = useProducts();
  const { mutateAsync: cancelSaleMutation,      isPending: isCancelling        } = useCancelSale();
  const { mutateAsync: dismissSaleMutation,     isPending: isDismissing        } = useDismissSale();
  const { mutateAsync: updateStatusMutation,    isPending: isUpdatingStatus     } = useUpdateSaleStatus();
  const { mutateAsync: reconcileSaleMutation,   isPending: isReconciling       } = useReconcileSale();
  const { mutateAsync: approveTransferMutation, isPending: isApprovingTransfer } = useApproveTransfer();

  const productMap = useMemo(() => {
    const map = new Map<string, Pick<Product, "sku" | "name">>();
    for (const p of products) map.set(p.id, { sku: p.sku, name: p.name });
    return map;
  }, [products]);

  const { printReceipt, printArea } = useReceiptPrinter(productMap);

  async function handleCancel(id: string) {
    try {
      const result = await cancelSaleMutation(id);
      toast.success("Venta cancelada", { description: `Stock restaurado · Orden #${id.slice(0, 8).toUpperCase()}` });
      setDialogSale(result.data);
    } catch (err) {
      toast.error("No se pudo cancelar", { description: err instanceof Error ? err.message : "Error al cancelar la venta" });
    }
  }

  async function handleDismiss(id: string, reason: string, restoreStock: boolean) {
    try {
      const result = await dismissSaleMutation({ id, payload: { reason, restoreStock } });
      toast.success("Orden desestimada", { description: `La orden fue ocultada${restoreStock ? " y el stock fue restaurado" : ""}.` });
      setDialogSale(result.data);
    } catch (err) {
      toast.error("No se pudo desestimar", { description: err instanceof Error ? err.message : "Error al desestimar la venta" });
    }
  }

  async function handleMarkAssembled(id: string) {
    try {
      await updateStatusMutation({ id, status: "assembled" });
      toast.success("Pedido marcado como armado");
      const sale = sales.find((s) => s.id === id);
      if (sale) printReceipt(sale, { reprint: false });
    } catch {
      toast.error("Error al actualizar pedido");
    }
  }

  async function handleMarkDelivered(id: string) {
    try {
      await updateStatusMutation({ id, status: "delivered" });
      toast.success("Pedido marcado como entregado");
    } catch {
      toast.error("Error al actualizar pedido");
    }
  }

  async function handleReconcile(id: string) {
    try {
      await reconcileSaleMutation(id);
      toast.success("Pago verificado en MercadoPago");
    } catch (err) {
      toast.error("Error al verificar pago", { description: err instanceof Error ? err.message : "Error desconocido" });
    }
  }

  async function handleApproveTransfer(id: string) {
    try {
      await approveTransferMutation(id);
      toast.success("Transferencia aprobada");
    } catch (err) {
      toast.error("Error al aprobar transferencia", { description: err instanceof Error ? err.message : "Error desconocido" });
    }
  }

  // Excluimos las desestimadas de todo el día (tabla + métricas), igual que el
  // dashboard: una venta desestimada no debe contar en ingresos ni en los conteos.
  const todaySales = useMemo(
    () => sales
      .filter((s) => isToday(s.createdAt) && !s.isDismissed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [sales]
  );

  // "Pagadas" agrupa todo lo cobrado (isPaidSale): pagado, armado y entregado.
  // Antes contaba solo "completed", por lo que los pedidos web que avanzaban
  // se caían de los ingresos del día.
  const paid       = todaySales.filter((s) => isPaidSale(s.status));
  const pending    = todaySales.filter((s) => s.status === "pending");
  const cancelled  = todaySales.filter((s) => s.status === "cancelled");

  const revenue    = paid.reduce((acc, s) => acc + s.total, 0);
  const units      = paid.reduce(
    (acc, s) => acc + s.items.reduce((a, i) => a + i.quantity, 0),
    0
  );
  const aov        = paid.length > 0 ? revenue / paid.length : 0;

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
            value={paid.length > 0 ? fmtARS(Math.round(aov)) : "—"}
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
            label="Pagadas"
            value={paid.length}
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
                  : `${todaySales.length} ${todaySales.length === 1 ? "orden" : "órdenes"} · ${paid.length} pagadas · ${pending.length} pendientes`}
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
                      <TableRow key={sale.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDialogSale(sale)}>
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
                          <div className="flex items-center justify-end gap-1.5">
                            {sale.status === "assembled" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Reimprimir ticket"
                                onClick={(e) => { e.stopPropagation(); printReceipt(sale, { reprint: true }); }}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <StatusBadge status={sale.status} channel={sale.channel} />
                          </div>
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

      <OrderDetailDialog
        sale={dialogSale}
        productMap={productMap}
        onClose={() => setDialogSale(null)}
        onCancel={handleCancel}
        onDismiss={handleDismiss}
        onMarkAssembled={handleMarkAssembled}
        onMarkDelivered={handleMarkDelivered}
        onPrintTicket={printReceipt}
        onReconcile={handleReconcile}
        isCancelling={isCancelling}
        isDismissing={isDismissing}
        isMarkingAssembled={isUpdatingStatus}
        isMarkingDelivered={isUpdatingStatus}
        isReconciling={isReconciling}
        onApproveTransfer={handleApproveTransfer}
        isApprovingTransfer={isApprovingTransfer}
      />

      {printArea}
    </main>
  );
}
