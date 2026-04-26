"use client";

import { useState } from "react";
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
  EyeOff,
  RotateCcw,
} from "lucide-react";
import type { Sale } from "@kwinna/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
// Checkbox nativo — no se usa @radix-ui/react-checkbox

// ─── Status Badge ─────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: Sale["status"] }) {
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

export function DismissBadge({ isDismissed }: { isDismissed?: boolean }) {
  if (!isDismissed) return null;
  return (
    <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground ml-2">
      <EyeOff className="mr-1 h-3 w-3" />
      Desestimada
    </Badge>
  );
}

// ─── Order Detail Dialog ──────────────────────────────────────────────────────

export interface OrderDetailDialogProps {
  sale:         Sale | null;
  onClose:      () => void;
  onCancel:     (id: string) => Promise<void>;
  onDismiss:    (id: string, reason: string, restoreStock: boolean) => Promise<void>;
  isCancelling: boolean;
  isDismissing: boolean;
}

export function OrderDetailDialog({
  sale,
  onClose,
  onCancel,
  onDismiss,
  isCancelling,
  isDismissing,
}: OrderDetailDialogProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showDismiss, setShowDismiss] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
  const [restoreStock, setRestoreStock] = useState(false);

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose();
      setConfirmCancel(false);
      setShowDismiss(false);
      setDismissReason("");
      setRestoreStock(false);
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
              <DialogDescription className="flex items-center pt-1">
                <StatusBadge status={sale.status} />
                <DismissBadge isDismissed={sale.isDismissed} />
                <span className="ml-auto text-xs text-muted-foreground">
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

              {/* ── Desestimada ── */}
              {sale.isDismissed && (
                <section className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold text-muted-foreground">Orden desestimada</p>
                  </div>
                  {sale.dismissReason && (
                    <p className="text-sm italic text-muted-foreground pl-6">
                      "{sale.dismissReason}"
                    </p>
                  )}
                </section>
              )}

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
              {sale.status === "pending" && !sale.isDismissed && (
                <section className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  {!confirmCancel ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => { setConfirmCancel(true); setShowDismiss(false); }}
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

              {/* ── Desestimar (tests) ── */}
              {!sale.isDismissed && (
                <section className="space-y-2 rounded-lg border border-border bg-muted/10 p-3">
                  {!showDismiss ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 border-dashed text-muted-foreground hover:text-foreground"
                      onClick={() => { setShowDismiss(true); setConfirmCancel(false); }}
                    >
                      <EyeOff className="h-4 w-4" />
                      Desestimar de métricas (Test/Excepción)
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          La orden se ocultará del dashboard pero se mantendrá en el historial.
                        </span>
                      </div>
                      
                      <Textarea
                        placeholder="Motivo (ej. Compra de prueba, error del sistema...)"
                        className="min-h-[60px] text-sm resize-none"
                        value={dismissReason}
                        onChange={(e) => setDismissReason(e.target.value)}
                      />

                      <label
                        htmlFor="restore-stock"
                        className="flex items-center gap-2 cursor-pointer text-xs font-medium text-muted-foreground"
                      >
                        <input
                          type="checkbox"
                          id="restore-stock"
                          checked={restoreStock}
                          onChange={(e) => setRestoreStock(e.target.checked)}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        <RotateCcw className="h-3 w-3" /> Restaurar stock al inventario
                      </label>

                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={isDismissing}
                          onClick={() => { setShowDismiss(false); setDismissReason(""); setRestoreStock(false); }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          disabled={isDismissing || !dismissReason.trim()}
                          onClick={async () => {
                            await onDismiss(sale.id, dismissReason, restoreStock);
                            setShowDismiss(false);
                          }}
                        >
                          {isDismissing ? "Aplicando..." : "Confirmar"}
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
