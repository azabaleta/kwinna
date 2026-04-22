"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { useDeleteProduct } from "@/hooks/use-products";

// ─── Props ────────────────────────────────────────────────────────────────────

interface DeleteProductDialogProps {
  product: Product;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DeleteProductDialog({ product }: DeleteProductDialogProps) {
  const [open, setOpen]         = useState(false);
  const [password, setPassword] = useState("");
  const inputRef                = useRef<HTMLInputElement>(null);

  const { mutateAsync, isPending } = useDeleteProduct();

  function handleOpenChange(next: boolean) {
    if (!next) setPassword("");
    setOpen(next);
  }

  async function handleConfirm() {
    if (!password) {
      inputRef.current?.focus();
      return;
    }

    try {
      await mutateAsync({ id: product.id, password });
      toast.success("Producto eliminado", {
        description: product.name,
      });
      setOpen(false);
      setPassword("");
    } catch (err) {
      // Extraer mensaje del backend (axios wraps response in err.response.data)
      const axiosError = err as { response?: { data?: { error?: string } } };
      const message    =
        axiosError.response?.data?.error ??
        (err instanceof Error ? err.message : "Error al eliminar el producto");
      toast.error("No se pudo eliminar", { description: message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Eliminar ${product.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Eliminar producto</DialogTitle>
          <DialogDescription>
            Estás por eliminar{" "}
            <span className="font-semibold text-foreground">{product.name}</span>{" "}
            (SKU: <code className="rounded bg-muted px-1 text-xs">{product.sku}</code>).
            Esta acción es <span className="font-semibold text-destructive">irreversible</span> y
            eliminará el producto junto con su stock y movimientos.
          </DialogDescription>
        </DialogHeader>

        {/* Password field */}
        <div className="space-y-1.5 py-2">
          <Label htmlFor="delete-password">Confirmá tu contraseña de admin</Label>
          <Input
            id="delete-password"
            ref={inputRef}
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleConfirm();
            }}
            disabled={isPending}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void handleConfirm()}
            disabled={!password || isPending}
          >
            {isPending ? "Eliminando…" : "Eliminar producto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
