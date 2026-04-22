"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ClipboardList,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Truck,
  User,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCancelSale, useSales } from "@/hooks/use-sale";

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Sale["status"] }) {
  if (status === "completed") {
    return (
      <Badge className="bg-green-500 text-white hover:bg-green-600">Pagado</Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge variant="outline" className="border-amber-400 text-amber-600">
        Pendiente
      </Badge>
    );
  }
  return <Badge variant="destructive">Cancelado</Badge>;
}

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

// ─── Order Detail Dialog ──────────────────────────────────────────────────────

interface OrderDetailDialogProps {
  sale:         Sale | null;
  onClose:      () => void;
  onCancel:     (id: string) => Promise<void>;
  isCancelling: boolean;
}

function OrderDetailDialog({
  sale,
  onClose,
  onCancel,
  isCancelling,
}: OrderDetailDialogProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose();
      setConfirmCancel(false);
    }
  }

  return (
    <Dialog open={!!sale} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        {sale && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Ticket #{sale.id.slice(0, 8).toUpperCase()}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 pt-1">
                <StatusBadge status={sale.status} />
                <span className="text-xs text-muted-foreground">
                  {new Date(sale.createdAt).toLocaleString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">

              {/* ── Cliente ── */}
              <section className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cliente
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{sale.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <a
                      href={`mailto:${sale.customerEmail}`}
                      className="text-primary hover:underline"
                    >
                      {sale.customerEmail}
                    </a>
                  </div>
                  {sale.customerPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>{sale.customerPhone}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* ── Envío ── */}
              <section className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Envío
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>
                      {sale.shippingAddress}, {sale.shippingCity},{" "}
                      {sale.shippingProvince}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>
                      {sale.shippingCost > 0
                        ? `$${sale.shippingCost.toLocaleString("es-AR")}`
                        : "Sin costo · coordinar con vendedora"}
                    </span>
                  </div>
                </div>
              </section>

              {/* ── Items ── */}
              <section className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Productos
                </p>
                <div className="divide-y rounded-lg border">
                  {sale.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <div>
                        <code className="font-mono text-xs text-muted-foreground">
                          {item.productId.slice(0, 8)}
                        </code>
                        {item.size && (
                          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                            {item.size}
                          </span>
                        )}
                        <span className="ml-2 text-muted-foreground">
                          × {item.quantity}
                        </span>
                      </div>
                      <span className="tabular-nums">
                        ${item.subtotal.toLocaleString("es-AR")}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">
                      ${sale.total.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              </section>

              {/* ── Zona destructiva: solo para pending ── */}
              {sale.status === "pending" && (
                <section className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  {!confirmCancel ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => setConfirmCancel(true)}
                    >
                      <XCircle className="h-4 w-4" />
                      Cancelar Venta y Restaurar Stock
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-xs text-destructive">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          Se revertirán las cantidades al inventario y la orden quedará
                          como <strong>cancelada</strong>. Esta acción no puede deshacerse.
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={isCancelling}
                          onClick={() => setConfirmCancel(false)}
                        >
                          Volver
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1 gap-1.5"
                          disabled={isCancelling}
                          onClick={async () => {
                            await onCancel(sale.id);
                            setConfirmCancel(false);
                          }}
                        >
                          {isCancelling ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Cancelando…
                            </>
                          ) : (
                            "Confirmar Cancelación"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </section>
              )}

            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const { sales, isLoading, isError, refetch } = useSales();
  const { mutateAsync: cancelSaleMutation, isPending: isCancelling } = useCancelSale();

  const pendingCount   = sales.filter((s) => s.status === "pending").length;
  const completedCount = sales.filter((s) => s.status === "completed").length;

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
                        <StatusBadge status={sale.status} />
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
        isCancelling={isCancelling}
      />
    </main>
  );
}
