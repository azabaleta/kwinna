"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, PackageMinus } from "lucide-react";
import type { Product, Stock } from "@kwinna/contracts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCombobox } from "@/components/inventory/product-combobox";
import { useStockOutMutation } from "@/hooks/use-stock";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RemoveStockDialogProps {
  products:   Product[];
  stockByProduct: Record<string, Stock[]>;
}

interface FormState {
  productId: string;
  size:      string;
  quantity:  string;
  reason:    string;
}

const INITIAL_FORM: FormState = {
  productId: "",
  size:      "",
  quantity:  "",
  reason:    "",
};

const REASON_OPTIONS = [
  "Ajuste por conteo",
  "Merma por falla",
  "Robo",
  "Pérdida desconocida",
  "Otro",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function RemoveStockDialog({ products, stockByProduct }: RemoveStockDialogProps) {
  const [open, setOpen]   = useState(false);
  const [form, setForm]   = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const { mutateAsync, isPending } = useStockOutMutation();

  // Talles conocidos para el producto seleccionado
  const knownSizes: string[] = (stockByProduct[form.productId] ?? [])
    .map((s) => s.size)
    .filter((s): s is string => s !== undefined && s !== "");

  const hasSizes = knownSizes.length > 0;

  useEffect(() => {
    if (open) { setForm(INITIAL_FORM); setErrors({}); }
  }, [open]);

  // Resetear size al cambiar de producto
  function handleProductChange(val: string) {
    setForm((f) => ({ ...f, productId: val, size: "" }));
    setErrors((e) => ({ ...e, productId: undefined, size: undefined }));
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!form.productId) next.productId = "Seleccioná un producto.";

    if (hasSizes && !form.size) next.size = "Seleccioná el talle.";

    const qty = Number(form.quantity);
    if (!form.quantity || isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      next.quantity = "Ingresá una cantidad entera mayor a 0.";
    }

    if (!form.reason) {
      next.reason = "El motivo es obligatorio.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const qty     = Number(form.quantity);
    const finalSize = form.size;
    const product = products.find((p) => p.id === form.productId);
    const entries = stockByProduct[form.productId] ?? [];
    const entry   = entries.find((s) => (s.size ?? "") === (finalSize ?? ""));
    const prevQty = entry?.quantity ?? 0;

    if (qty > prevQty) {
      setErrors((prev) => ({ ...prev, quantity: `Solo hay ${prevQty} unidades disponibles.` }));
      return;
    }

    try {
      await mutateAsync({
        productId: form.productId,
        quantity:  qty,
        size:      finalSize || undefined,
        reason:    form.reason,
      });

      const sizeLabel = finalSize ? ` · talle ${finalSize}` : "";
      toast.success("Stock descontado", {
        description: `${product?.name ?? ""}${sizeLabel}: ${prevQty} → ${prevQty - qty} uds.`,
      });
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al descontar el stock";
      toast.error("Error al descontar", { description: message });
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <PackageMinus className="h-4 w-4 text-destructive" />
          Descontar Stock
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Descontar Stock</DialogTitle>
          <DialogDescription>
            Registrá una salida manual de inventario por mermas, robos o ajuste de conteo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5 py-2">

            {/* ── Producto ── */}
            <div className="space-y-1.5">
              <Label htmlFor="rs-product">Producto</Label>
              <ProductCombobox
                products={products}
                value={form.productId}
                onValueChange={handleProductChange}
                error={!!errors.productId}
              />
            </div>

            {/* ── Talle ── */}
            {form.productId && (
              <div className="space-y-1.5">
                <Label htmlFor="rs-size">
                  Talle
                  {!hasSizes && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (sin talle — accesorio)
                    </span>
                  )}
                </Label>
                {hasSizes ? (
                  <Select
                    value={form.size}
                    onValueChange={(val) => {
                      setForm((f) => ({ ...f, size: val }));
                      setErrors((e) => ({ ...e, size: undefined, quantity: undefined }));
                    }}
                  >
                    <SelectTrigger id="rs-size" aria-invalid={!!errors.size}>
                      <SelectValue placeholder="Seleccioná el talle…" />
                    </SelectTrigger>
                    <SelectContent>
                      {knownSizes.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="rs-size"
                    placeholder="Ej: S, M, L  (dejá vacío si no aplica)"
                    value={form.size}
                    onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                  />
                )}
                {errors.size && (
                  <p className="text-xs text-destructive">{errors.size}</p>
                )}
              </div>
            )}

            {/* ── Cantidad ── */}
            <div className="space-y-1.5">
              <Label htmlFor="rs-qty">Cantidad a retirar</Label>
              <Input
                id="rs-qty"
                type="number"
                min={1}
                step={1}
                placeholder="Ej: 2"
                value={form.quantity}
                aria-invalid={!!errors.quantity}
                onChange={(e) => {
                  setForm((f) => ({ ...f, quantity: e.target.value }));
                  setErrors((err) => ({ ...err, quantity: undefined }));
                }}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity}</p>
              )}
            </div>

            {/* ── Motivo ── */}
            <div className="space-y-1.5">
              <Label htmlFor="rs-reason">
                Motivo
                <span className="ml-1 text-xs font-normal text-destructive">*</span>
              </Label>
              <Select
                value={form.reason}
                onValueChange={(val) => {
                  setForm((f) => ({ ...f, reason: val }));
                  setErrors((err) => ({ ...err, reason: undefined }));
                }}
              >
                <SelectTrigger id="rs-reason" aria-invalid={!!errors.reason}>
                  <SelectValue placeholder="Seleccioná un motivo…" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.reason && (
                <p className="text-xs text-destructive">{errors.reason}</p>
              )}
            </div>

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending} className="gap-2">
              {isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</>
                : <><PackageMinus className="h-4 w-4" />Descontar</>
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
