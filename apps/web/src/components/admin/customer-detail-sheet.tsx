"use client";

import { useState } from "react";
import {
  Mail,
  CalendarDays,
  ShoppingBag,
  CreditCard,
  UserCheck,
  UserX,
  History,
} from "lucide-react";
import type { CustomerMetrics, Sale } from "@kwinna/contracts";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderDetailDialog, StatusBadge, DismissBadge } from "./order-detail-dialog";
import { useCancelSale, useDismissSale } from "@/hooks/use-sale";
import { toast } from "sonner";

interface CustomerDetailSheetProps {
  customer: CustomerMetrics | null;
  sales: Sale[];
  onClose: () => void;
}

function fmt(n: number): string {
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export function CustomerDetailSheet({
  customer,
  sales,
  onClose,
}: CustomerDetailSheetProps) {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const { mutateAsync: cancelSaleMutation, isPending: isCancelling } = useCancelSale();
  const { mutateAsync: dismissSaleMutation, isPending: isDismissing } = useDismissSale();

  // Sort sales: newest first
  const sortedSales = [...sales].sort(
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
    <>
      <Sheet open={!!customer} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {customer && (
            <>
              <SheetHeader className="pb-6 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                      {customer.name}
                      {customer.emailVerified ? (
                        <UserCheck className="h-4 w-4 text-green-500" />
                      ) : (
                        <UserX className="h-4 w-4 text-muted-foreground" />
                      )}
                    </SheetTitle>
                    <SheetDescription className="flex items-center gap-2 mt-1">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <a href={`mailto:${customer.email}`} className="hover:underline">
                        {customer.email}
                      </a>
                    </SheetDescription>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" /> Registrado
                    </p>
                    <p className="text-sm font-medium">
                      {new Date(customer.createdAt).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <ShoppingBag className="h-3.5 w-3.5" /> Órdenes Históricas
                    </p>
                    <p className="text-sm font-medium">
                      {sortedSales.length} compras
                    </p>
                  </div>
                  <div className="space-y-1 rounded-lg border bg-muted/30 p-3 col-span-2">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <CreditCard className="h-3.5 w-3.5" /> Facturación Histórica
                    </p>
                    <p className="text-xl font-bold text-foreground tabular-nums">
                      {fmt(customer.totalLifetime)}
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground font-medium">
                      <span>Este mes: {fmt(customer.totalMonth)}</span>
                      <span>Últimos 6m: {fmt(customer.totalSemester)}</span>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-8 space-y-4">
                <h3 className="flex items-center gap-2 font-semibold text-foreground">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Historial de Órdenes
                </h3>

                {sortedSales.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4 text-center border rounded-lg bg-muted/10">
                    Este cliente aún no tiene compras registradas.
                  </p>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[100px]">Orden</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedSales.map((sale) => (
                          <TableRow
                            key={sale.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedSale(sale)}
                          >
                            <TableCell className="font-mono text-xs">
                              {sale.id.slice(0, 8).toUpperCase()}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(sale.createdAt).toLocaleDateString("es-AR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={sale.status} />
                              {sale.isDismissed && (
                                <Badge variant="outline" className="ml-1 px-1 border-muted-foreground/30 text-[10px]">
                                  Excep
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold tabular-nums">
                              ${sale.total.toLocaleString("es-AR")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <OrderDetailDialog
        sale={selectedSale}
        onClose={() => setSelectedSale(null)}
        onCancel={handleCancel}
        onDismiss={handleDismiss}
        isCancelling={isCancelling}
        isDismissing={isDismissing}
      />
    </>
  );
}
