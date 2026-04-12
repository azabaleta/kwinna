"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, PackagePlus } from "lucide-react";
import type { Product } from "@kwinna/contracts";
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
import { useStockIn } from "@/hooks/use-stock";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RestockDialogProps {
  products: Product[];
  /** stock actual indexado por productId, para calcular el nuevo total en el toast */
  currentStock: Record<string, number>;
}

interface FormState {
  productId: string;
  quantity: string;
  reason: string;
}

const INITIAL_FORM: FormState = {
  productId: "",
  quantity: "",
  reason: "",
};

const REASON_OPTIONS = [
  "Compra a proveedor",
  "Devolución de cliente",
  "Ajuste de inventario",
  "Transferencia entre sucursales",
  "Otro",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function RestockDialog({ products, currentStock }: RestockDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const { mutateAsync, isPending } = useStockIn();

  // Resetea el formulario cada vez que se abre el modal
  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM);
      setErrors({});
    }
  }, [open]);

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): boolean {
    const next: typeof errors = {};

    if (!form.productId) {
      next.productId = "Seleccioná un producto.";
    }

    const qty = Number(form.quantity);
    if (!form.quantity || isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      next.quantity = "Ingresá una cantidad entera mayor a 0.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const qty = Number(form.quantity);
    const product = products.find((p) => p.id === form.productId);
    const prevQty = currentStock[form.productId] ?? 0;
    const newQty = prevQty + qty;

    try {
      await mutateAsync({
        productId: form.productId,
        quantity: qty,
        reason: form.reason || undefined,
      });

      toast.success("Stock repuesto", {
        description: `${product?.name ?? form.productId}: ${prevQty} → ${newQty} unidades`,
      });

      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al reponer el stock";
      toast.error("Error al reponer", { description: message });
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PackagePlus className="h-4 w-4" />
          Reponer Stock
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Reponer Stock</DialogTitle>
          <DialogDescription>
            Registrá un ingreso de mercadería. El stock se actualizará al instante.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5 py-2">

            {/* ── Producto ── */}
            <div className="space-y-1.5">
              <Label htmlFor="restock-product">Producto</Label>
              <Select
                value={form.productId}
                onValueChange={(val) => {
                  setForm((f) => ({ ...f, productId: val }));
                  setErrors((e) => ({ ...e, productId: undefined }));
                }}
              >
                <SelectTrigger id="restock-product" aria-invalid={!!errors.productId}>
                  <SelectValue placeholder="Seleccioná un producto…" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span>{p.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({currentStock[p.id] ?? 0} en stock)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.productId && (
                <p className="text-xs text-destructive">{errors.productId}</p>
              )}
            </div>

            {/* ── Cantidad ── */}
            <div className="space-y-1.5">
              <Label htmlFor="restock-qty">Cantidad</Label>
              <Input
                id="restock-qty"
                type="number"
                min={1}
                step={1}
                placeholder="Ej: 24"
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
              <Label htmlFor="restock-reason">
                Motivo{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Select
                value={form.reason}
                onValueChange={(val) => setForm((f) => ({ ...f, reason: val }))}
              >
                <SelectTrigger id="restock-reason">
                  <SelectValue placeholder="Seleccioná un motivo…" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <PackagePlus className="h-4 w-4" />
                  Reponer
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
