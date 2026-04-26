"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import type { Sale } from "@kwinna/contracts";
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
import { useCancelSale, useSales, useDismissSale } from "@/hooks/use-sale";
import { OrderDetailDialog, StatusBadge, DismissBadge } from "@/components/admin/order-detail-dialog";

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

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

export default function OrdersPage() {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const { sales, isLoading, isError, refetch } = useSales();
  const { mutateAsync: cancelSaleMutation, isPending: isCancelling } = useCancelSale();
  const { mutateAsync: dismissSaleMutation, isPending: isDismissing } = useDismissSale();

  const pendingCount   = sales.filter((s) => s.status === "pending" && !s.isDismissed).length;
  const completedCount = sales.filter((s) => s.status === "completed" && !s.isDismissed).length;

  const sorted = [...sales].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  async function handleCancel(id: string) {
    try {
      const result = await cancelSaleMutation(id);
      toast.success("Venta cancelada", {
        description: `Stock restaurado · Orden #${id.slice(0, 8).toUpperCase()}`,
      });
      setSelectedSale(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cancelar la venta";
      toast.error("No se pudo cancelar", { description: message });
    }
  }

  async function handleDismiss(id: string, reason: string, restoreStock: boolean) {
    try {
      const result = await dismissSaleMutation({ id, payload: { reason, restoreStock } });
      toast.success("Orden desestimada", {
        description: `La orden fue ocultada del dashboard${restoreStock ? " y el stock fue restaurado" : ""}.`,
      });
      setSelectedSale(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al desestimar la venta";
      toast.error("No se pudo desestimar", { description: message });
    }
  }

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Pedidos</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Cargando…"
                  : `${sales.length} órdenes · ${completedCount} pagadas · ${pendingCount} pendientes`}
              </p>
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

        {/* ── Pending warning ── */}
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {pendingCount === 1
              ? "Hay 1 orden pendiente — el stock ya fue reservado."
              : `Hay ${pendingCount} órdenes pendientes — el stock ya fue reservado.`}
          </div>
        )}

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
            <CardTitle>Historial de Órdenes</CardTitle>
            <CardDescription>
              Hacé clic en una fila para ver el ticket completo con PII y detalle de envío.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Orden</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="pr-6 text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                ) : sorted.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No hay ventas registradas aún.
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map((sale) => (
                    <TableRow
                      key={sale.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedSale(sale)}
                    >
                      <TableCell className="pl-6">
                        <code className="font-mono text-xs font-medium text-foreground">
                          #{sale.id.slice(0, 8).toUpperCase()}
                        </code>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(sale.createdAt).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {sale.customerName}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {sale.customerEmail}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sale.shippingCity}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        ${sale.total.toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex items-center justify-end">
                          <StatusBadge status={sale.status} />
                          <DismissBadge isDismissed={sale.isDismissed} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>

      <OrderDetailDialog
        sale={selectedSale}
        onClose={() => setSelectedSale(null)}
        onCancel={handleCancel}
        onDismiss={handleDismiss}
        isCancelling={isCancelling}
        isDismissing={isDismissing}
      />
    </main>
  );
}
