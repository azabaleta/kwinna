"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Stock } from "@kwinna/contracts";
import { Button } from "@/components/ui/button";
import { useProduct } from "@/hooks/use-products";
import { useProductStock } from "@/hooks/use-stock";
import { useCartStore } from "@/store/use-cart-store";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

function sortSizes(entries: Stock[]): Stock[] {
  return [...entries].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a.size ?? "");
    const bi = SIZE_ORDER.indexOf(b.size ?? "");
    if (ai === -1 && bi === -1) return (a.size ?? "").localeCompare(b.size ?? "");
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// ─── Image Carousel ───────────────────────────────────────────────────────────

function ImageCarousel({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const safeImages = images.length > 0 ? images : null;
  const current = safeImages?.[idx];

  function prev() {
    setIdx((i) => (i === 0 ? (safeImages?.length ?? 1) - 1 : i - 1));
  }
  function next() {
    setIdx((i) => (i === (safeImages?.length ?? 1) - 1 ? 0 : i + 1));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-primary/10">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={name} className="h-full w-full object-cover transition-opacity duration-300" />
        ) : (
          <div className="flex h-full items-center justify-center text-primary/20">
            <ShoppingBag className="h-20 w-20" />
          </div>
        )}

        {safeImages && safeImages.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-card/80 shadow backdrop-blur-sm transition-colors hover:bg-card"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-card/80 shadow backdrop-blur-sm transition-colors hover:bg-card"
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="h-4 w-4 text-foreground" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {safeImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200",
                    i === idx ? "w-4 bg-primary" : "w-1.5 bg-primary/30"
                  )}
                  aria-label={`Ver imagen ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {safeImages && safeImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {safeImages.map((src, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={cn(
                "h-16 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-150",
                i === idx ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${name} ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PDPSkeleton() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="aspect-[3/4] w-full animate-pulse rounded-2xl bg-muted" />
          <div className="flex flex-col gap-4 pt-2">
            <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-6 w-12 animate-pulse rounded-full bg-muted" />)}
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 w-14 animate-pulse rounded-xl bg-muted" />)}
            </div>
            <div className="mt-2 h-12 w-full animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── Client Component ─────────────────────────────────────────────────────────

export function ProductDetailClient({ id }: { id: string }) {
  const router = useRouter();

  const { product, isLoading: productLoading, isError: productError } = useProduct(id);
  const { stock,   isLoading: stockLoading }                          = useProductStock(id);

  const addItem = useCartStore((s) => s.addItem);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);

  const hasSizes    = stock.some((s) => s.size !== undefined && s.size !== "");
  const sortedStock = hasSizes ? sortSizes(stock.filter((s) => s.size)) : [];

  const noSizeEntry = !hasSizes ? stock[0] : undefined;

  function handleAddToCart() {
    if (!product) return;
    if (hasSizes && !selectedSize) {
      toast.error("Seleccioná un talle para continuar");
      return;
    }
    addItem(product, 1, selectedSize);
    toast.success("Añadido al carrito", {
      description: selectedSize ? `Talle ${selectedSize}` : product.name,
    });
  }

  if (productLoading || stockLoading) return <PDPSkeleton />;

  if (productError || !product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-sm text-muted-foreground">Producto no encontrado.</p>
          <Button asChild variant="outline" className="rounded-full px-6 text-xs tracking-widest uppercase">
            <Link href="/shop">Volver a la tienda</Link>
          </Button>
        </div>
      </main>
    );
  }

  const outOfStock = hasSizes
    ? sortedStock.every((s) => s.quantity === 0)
    : (noSizeEntry?.quantity ?? 0) === 0;

  return (
    <main className="min-h-screen bg-background px-4 py-10 md:px-8">
      <div className="mx-auto max-w-5xl">

        <button
          onClick={() => router.back()}
          className="mb-8 flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>

        <div className="grid gap-10 lg:grid-cols-2">

          <ImageCarousel images={product.images} name={product.name} />

          <div className="flex flex-col gap-5">

            <div className="space-y-2">
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground lg:text-3xl">
                {product.name}
              </h1>
              <p className="text-3xl font-bold tabular-nums text-foreground">
                ${product.price.toLocaleString("es-AR")}
              </p>
            </div>

            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border/60 bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground capitalize"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {product.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}

            {hasSizes && (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                  Talle
                  {selectedSize && <span className="ml-2 font-bold text-foreground">{selectedSize}</span>}
                </p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Seleccionar talle">
                  {sortedStock.map((entry) => {
                    const unavailable = entry.quantity === 0;
                    const active      = selectedSize === entry.size;
                    return (
                      <button
                        key={entry.size}
                        role="radio"
                        aria-checked={active}
                        disabled={unavailable}
                        onClick={() => setSelectedSize(entry.size)}
                        className={cn(
                          "flex h-11 min-w-[3rem] items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-all duration-150",
                          active
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : unavailable
                              ? "cursor-not-allowed border-border/40 bg-muted/40 text-muted-foreground/40 line-through"
                              : "border-border bg-card text-foreground hover:border-primary/60 hover:bg-primary/5"
                        )}
                      >
                        {entry.size}
                        {!unavailable && entry.quantity <= 3 && (
                          <span className="ml-1.5 text-[9px] font-bold text-amber-500">·{entry.quantity}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!hasSizes && noSizeEntry && (
              <p className={cn("text-xs", outOfStock ? "text-destructive" : "text-emerald-600")}>
                {outOfStock ? "Sin stock disponible" : `${noSizeEntry.quantity} en stock`}
              </p>
            )}

            <div className="mt-2 space-y-3">
              <Button
                size="lg"
                className="w-full rounded-full text-xs font-semibold tracking-widest uppercase"
                disabled={outOfStock || (hasSizes && !selectedSize)}
                onClick={handleAddToCart}
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                {outOfStock
                  ? "Agotado"
                  : hasSizes && !selectedSize
                    ? "Elegí un talle"
                    : "Agregar al carrito"}
              </Button>

              {hasSizes && !selectedSize && !outOfStock && (
                <p className="text-center text-[11px] text-muted-foreground/70">
                  Seleccioná un talle para continuar
                </p>
              )}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
