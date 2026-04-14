"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  selectCartItems,
  selectCartTotal,
  selectItemCount,
  useCartStore,
} from "@/store/use-cart-store";

// ─── Component ────────────────────────────────────────────────────────────────
// El panel muestra el carrito y navega a /checkout para la confirmación.
// La llamada a la API (useCreateSale) ocurre en la página de checkout,
// donde el usuario también completa sus datos de contacto.

export function CartPanel() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const items      = useCartStore(selectCartItems);
  const total      = useCartStore(selectCartTotal);
  const count      = useCartStore(selectItemCount);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart  = useCartStore((s) => s.clearCart);

  function handleGoToCheckout() {
    setOpen(false);
    router.push("/checkout");
  }

  return (
    <>
      {/* ── Floating FAB ─────────────────────────────────────────────── */}
      {count > 0 && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full bg-primary px-5 py-3.5 text-primary-foreground shadow-soft transition-all duration-200 hover:scale-105 hover:shadow-[0_8px_32px_rgba(112,0,94,0.45)] active:scale-95"
        >
          <ShoppingBag className="h-4 w-4" />
          <span className="text-xs font-semibold tracking-wide">
            {count} {count === 1 ? "pieza" : "piezas"}
          </span>
          <span className="h-3.5 w-px bg-primary-foreground/30" />
          <span className="text-xs font-bold tabular-nums">
            ${total.toLocaleString("es-AR")}
          </span>
        </button>
      )}

      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Slide-over ───────────────────────────────────────────────── */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-card shadow-soft transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-widest text-foreground uppercase">
              Tu selección
            </h2>
            {count > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                {count}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Items */}
        <div className="flex-1 space-y-2 overflow-y-auto px-5 py-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground/20" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Tu selección está vacía
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Agrega piezas desde la tienda
                </p>
              </div>
            </div>
          ) : (
            items.map(({ product, quantity, size }) => (
              <div
                key={`${product.id}::${size ?? ""}`}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 p-3 transition-colors hover:border-border"
              >
                {/* Thumbnail */}
                <div className="flex h-12 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ShoppingBag className="h-3.5 w-3.5 text-primary/50" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {size && (
                      <span className="mr-1.5 rounded bg-primary/10 px-1 py-px font-medium text-primary">
                        {size}
                      </span>
                    )}
                    {quantity} × ${product.price.toLocaleString("es-AR")}
                  </p>
                </div>

                {/* Subtotal + remove */}
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-xs font-bold tabular-nums text-foreground">
                    ${(product.price * quantity).toLocaleString("es-AR")}
                  </p>
                  <button
                    onClick={() => removeItem(product.id, size)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Quitar ${product.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="space-y-4 border-t border-border/50 p-5">
            {/* Total row */}
            <div className="flex items-baseline justify-between">
              <span className="text-xs tracking-wide text-muted-foreground uppercase">
                Total
              </span>
              <span className="text-2xl font-bold tabular-nums text-foreground">
                ${total.toLocaleString("es-AR")}
              </span>
            </div>

            {/* CTA → checkout */}
            <Button
              className="w-full rounded-full text-xs font-semibold tracking-widest uppercase"
              size="lg"
              onClick={handleGoToCheckout}
            >
              Finalizar Compra
            </Button>

            {/* Clear */}
            <button
              onClick={clearCart}
              className="w-full text-center text-[11px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
            >
              Vaciar selección
            </button>
          </div>
        )}
      </div>
    </>
  );
}
