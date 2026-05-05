"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ClipboardList, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import type { Product, Sale } from "@kwinna/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCancelSale, useSales, useDismissSale, useUpdateSaleStatus, useReconcileSale, useApproveTransfer } from "@/hooks/use-sale";
import { useProducts } from "@/hooks/use-products";
import { useOperators } from "@/hooks/use-operators";
import { OrderDetailDialog, StatusBadge, DismissBadge } from "@/components/admin/order-detail-dialog";
import { selectUser, useAuthStore } from "@/store/use-auth-store";

const PAGE_SIZE = 25;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow>
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <TableCell key={i}><div className="h-4 animate-pulse rounded bg-muted" /></TableCell>
      ))}
    </TableRow>
  );
}

// ─── Pagination bar ───────────────────────────────────────────────────────────

function Pagination({
  total, page, pageSize, onChange,
}: { total: number; page: number; pageSize: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const from = page * pageSize + 1;
  const to   = Math.min((page + 1) * pageSize, total);
  return (
    <div className="flex items-center justify-between border-t border-border px-6 py-3">
      <p className="text-xs text-muted-foreground">
        Mostrando {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="px-2 text-xs text-muted-foreground">{page + 1} / {pages}</span>
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= pages - 1} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Content (necesita Suspense por useSearchParams) ──────────────────────────

function OrdersContent() {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const user        = useAuthStore(selectUser);
  const isAdmin     = user?.role === "admin";

  // ── Leer filtros desde URL ─────────────────────────────────────────────────
  const channelFilter = (searchParams.get("channel") ?? "all") as "all" | "web" | "pos";
  const vendorFilter  = searchParams.get("vendor") ?? "all";
  const page          = parseInt(searchParams.get("page") ?? "0", 10);

  // ── Actualizar URL ─────────────────────────────────────────────────────────
  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "all" || value === "0") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  function setChannelFilter(v: string) { updateParams({ channel: v, page: null }); }
  function setVendorFilter(v: string)  { updateParams({ vendor: v,  page: null }); }
  function setPage(p: number)          { updateParams({ page: String(p) }); }
  function clearFilters()              { router.replace(pathname); }

  // ── Data ───────────────────────────────────────────────────────────────────
  const { sales, isLoading, isError, refetch } = useSales();
  const { mutateAsync: cancelSaleMutation,      isPending: isCancelling        } = useCancelSale();
  const { mutateAsync: dismissSaleMutation,     isPending: isDismissing        } = useDismissSale();
  const { mutateAsync: updateStatusMutation,    isPending: isMarkingAssembled  } = useUpdateSaleStatus();
  const { mutateAsync: reconcileSaleMutation,   isPending: isReconciling       } = useReconcileSale();
  const { mutateAsync: approveTransferMutation, isPending: isApprovingTransfer } = useApproveTransfer();
  const { products } = useProducts();
  const { operators } = useOperators();

  const productMap = useMemo(() => {
    const map = new Map<string, Pick<Product, "sku" | "name">>();
    for (const p of products) map.set(p.id, { sku: p.sku, name: p.name });
    return map;
  }, [products]);

  const operatorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of operators) map.set(o.id, o.name);
    return map;
  }, [operators]);

  // ── Filtrado + paginación ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...sales].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (channelFilter !== "all") {
      result = result.filter((s) => s.channel === channelFilter);
    }
    if (isAdmin && vendorFilter === "none") {
      result = result.filter((s) => !s.vendorId);
    } else if (isAdmin && vendorFilter !== "all") {
      result = result.filter((s) => s.vendorId === vendorFilter);
    }
    return result;
  }, [sales, channelFilter, vendorFilter, isAdmin]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const pendingCount   = sales.filter((s) => s.status === "pending" && !s.isDismissed).length;
  const completedCount = sales.filter((s) => s.status === "completed" && !s.isDismissed).length;
  const filtersActive  = channelFilter !== "all" || (isAdmin && vendorFilter !== "all");

  // ── Dialog state (no va en URL) ────────────────────────────────────────────
  const [dialogSale, setDialogSale] = useState<Sale | null>(null);

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
      toast.success("Pedido marcado como entregado");
    } catch {
      toast.error("Error al actualizar pedido");
      throw new Error("Failed to update status");
    }
  }

  async function handleReconcile(id: string) {
    try {
      await reconcileSaleMutation(id);
      toast.success("Pago verificado en MercadoPago", { description: "La orden se marcó como pagada exitosamente." });
    } catch (err) {
      toast.error("Error al verificar pago", { description: err instanceof Error ? err.message : "Error desconocido" });
      throw new Error("Failed to reconcile");
    }
  }

  async function handleApproveTransfer(id: string) {
    try {
      await approveTransferMutation(id);
      toast.success("Transferencia aprobada", { description: "La orden se marcó como pagada exitosamente." });
    } catch (err) {
      toast.error("Error al aprobar transferencia", { description: err instanceof Error ? err.message : "Error desconocido" });
      throw new Error("Failed to approve transfer");
    }
  }

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
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
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </Button>
        </div>

        {/* Pending warning */}
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {pendingCount === 1
              ? "Hay 1 orden pendiente — el stock ya fue reservado."
              : `Hay ${pendingCount} órdenes pendientes — el stock ya fue reservado.`}
          </div>
        )}

        {/* Error */}
        {isError && (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">No se pudieron cargar las ventas.</p>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardHeader className="pb-3 space-y-3">
            <div>
              <CardTitle>Historial de Órdenes</CardTitle>
              <CardDescription>Hacé clic en una fila para ver el ticket completo.</CardDescription>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los canales</SelectItem>
                  <SelectItem value="web">Solo Web</SelectItem>
                  <SelectItem value="pos">Solo POS</SelectItem>
                </SelectContent>
              </Select>

              {isAdmin && (
                <Select value={vendorFilter} onValueChange={setVendorFilter}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue placeholder="Vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los vendedores</SelectItem>
                    <SelectItem value="none">Sin vendedor</SelectItem>
                    {operators.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filtersActive && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={clearFilters}>
                  Limpiar filtros · {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Orden</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Canal</TableHead>
                  {isAdmin && <TableHead>Vendedor</TableHead>}
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="pr-6 text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="py-10 text-center text-sm text-muted-foreground">
                      No hay ventas que coincidan con los filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((sale) => (
                    <TableRow
                      key={sale.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setDialogSale(sale)}
                    >
                      <TableCell className="pl-6">
                        <code className="font-mono text-xs font-medium text-foreground">
                          #{sale.id.slice(0, 8).toUpperCase()}
                        </code>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(sale.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">{sale.customerName}</span>
                        <span className="block text-xs text-muted-foreground">{sale.customerEmail}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          sale.channel === "pos"
                            ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}>
                          {sale.channel === "pos" ? "POS" : "Web"}
                        </span>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-sm text-muted-foreground">
                          {sale.vendorId ? (operatorMap.get(sale.vendorId) ?? "—") : "—"}
                        </TableCell>
                      )}
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

            <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
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
        onReconcile={handleReconcile}
        isCancelling={isCancelling}
        isDismissing={isDismissing}
        isMarkingAssembled={isMarkingAssembled}
        isReconciling={isReconciling}
        onApproveTransfer={handleApproveTransfer}
        isApprovingTransfer={isApprovingTransfer}
      />
    </main>
  );
}

// ─── Page wrapper con Suspense ────────────────────────────────────────────────

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <main className="px-4 py-8 md:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-96 animate-pulse rounded-lg bg-muted" />
        </div>
      </main>
    }>
      <OrdersContent />
    </Suspense>
  );
}
