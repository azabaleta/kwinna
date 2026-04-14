"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Product } from "@kwinna/contracts";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/use-products";
import { useStock } from "@/hooks/use-stock";
import { selectCartItems, useCartStore } from "@/store/use-cart-store";
import { ProductCard } from "@/components/shop/product-card";
import { CartPanel } from "@/components/shop/cart-panel";
import { cn } from "@/lib/utils";

// ─── Category filter config ───────────────────────────────────────────────────
// El mapa de nombre → UUID debe coincidir con los categoryId de los productos
// (tanto en mocks/db.ts como en el seed real de la BD).

const CATEGORIES = ["Todo", "Vestidos", "Tops", "Pantalones", "Accesorios"] as const;
type Category = (typeof CATEGORIES)[number];
type FilterableCategory = Exclude<Category, "Todo">;

const CATEGORY_ID_MAP: Record<FilterableCategory, string> = {
  Vestidos:   "770e8400-e29b-41d4-a716-446655440001",
  Tops:       "770e8400-e29b-41d4-a716-446655440002",
  Pantalones: "770e8400-e29b-41d4-a716-446655440003",
  Accesorios: "770e8400-e29b-41d4-a716-446655440004",
};

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] bg-card">
      <div className="aspect-[3/4] animate-pulse bg-muted" />
      <div className="space-y-2 px-3 py-3">
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

// ─── Isotipo watermark (para el empty state) ──────────────────────────────────

function IsotipoFade() {
  return (
    <svg
      viewBox="0 0 976.91 524.76"
      xmlns="http://www.w3.org/2000/svg"
      className="h-16 w-16 text-primary/10"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M280.26.28c-103.19-5.26-103.52,64.28-100.34,144.94,0,0,0,159.8,0,159.8,0,34.84-28.34,63.18-63.18,63.18-36.08,1.89-67.01-26.9-66.89-63.18,0,0,0-163.52,0-163.52H1.54c4.57,95.06-34.55,271.9,111.49,275,62.84,2.01,115.32-48.53,115.2-111.49.94-46.4-.68-182.32,0-226.69-.39-28.27,30.18-32.02,52.03-29.73,16.39,0,29.73,13.33,29.73,29.73,0,0,0,66.89,0,66.89v234.13c-3.44,80.06-2.32,150.68,100.34,144.94,80.66-4.35,81.12-74.96,78.04-137.5,0,0,0-7.43,0-7.43v-144.94c1.16-83.55,128.9-83.61,130.07,0,0,0,0,144.93,0,144.93,0,0,0,7.43,0,7.43-3.19,62.29-2.43,133.4,78.05,137.5,78.95,5.85,106.97-42.04,100.33-115.21-.27-17.31.2-153.84,0-174.67,0-34.84,28.34-63.18,63.18-63.18,36.07-1.89,67.02,26.9,66.89,63.18,0,0,0,174.67,0,174.67h48.31c-5.86-95.66,37.94-283.44-111.49-286.15-62.84-2-115.32,48.53-115.2,111.49-.59,46.99.42,166.6,0,211.83.39,28.27-30.18,32.02-52.03,29.73-16.39,0-29.73-13.33-29.73-29.73.24-43.6-.17-166.45,0-211.83.12-62.95-52.37-113.49-115.21-111.49-140.61,4.61-108.86,161.91-111.49,256.43-.38,3.51.27,61.97,0,66.89.39,28.27-30.19,32.02-52.04,29.73-16.39,0-29.72-13.34-29.72-29.73,0,0,0-66.89,0-66.89v-234.13c2.23-63.34,6.48-140.61-78.04-144.94"
      />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("Todo");

  const {
    products,
    isLoading: loadingProducts,
    isError: isProductsError,
  } = useProducts();

  const {
    stock,
    isLoading: loadingStock,
    isError: isStockError,
  } = useStock();

  const cartItems = useCartStore(selectCartItems);
  const addItem   = useCartStore((s) => s.addItem);

  const isLoading = loadingProducts || loadingStock;

  // ── Error toasts ─────────────────────────────────────────────────────────
  // ID fijo en sonner → evita duplicados si el estado persiste entre renders.

  useEffect(() => {
    if (isProductsError) {
      toast.error("No se pudo cargar el catálogo", {
        id: "products-fetch-error",
        description: "Verificá tu conexión e intentá de nuevo",
      });
    }
  }, [isProductsError]);

  useEffect(() => {
    if (isStockError) {
      toast.warning("Stock no disponible", {
        id: "stock-fetch-error",
        description: "Las cantidades podrían no estar actualizadas",
      });
    }
  }, [isStockError]);

  // ── Filtering (front-end slicing) ─────────────────────────────────────────
  // "Todo" muestra todos los productos; las otras categorías filtran por categoryId.

  const visibleProducts =
    activeCategory === "Todo"
      ? products
      : products.filter((p) => p.categoryId === CATEGORY_ID_MAP[activeCategory]);

  // ── Lookup indices para O(1) en el render ─────────────────────────────────

  const stockIndex = Object.fromEntries(stock.map((s)     => [s.productId, s.quantity]));
  const cartIndex  = Object.fromEntries(cartItems.map((i) => [i.product.id, i.quantity]));

  // ── Add to cart ───────────────────────────────────────────────────────────

  function handleAdd(product: Product) {
    const stockQty = stockIndex[product.id] ?? 0;
    const inCart   = cartIndex[product.id]  ?? 0;

    if (inCart >= stockQty) {
      toast.error("Sin stock disponible", { description: product.name });
      return;
    }

    addItem(product);
    toast.success("Añadido al carrito", { description: product.name });
  }

  return (
    <main className="min-h-screen bg-background pb-32">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-8 md:py-24">
          <p className="mb-2 text-xs font-semibold tracking-[0.25em] text-primary uppercase">
            Nueva Temporada
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
            Colección 2025
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Piezas únicas diseñadas para la mujer que define su propio estilo.
          </p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </section>

      <div className="mx-auto max-w-5xl px-4 md:px-8">

        {/* ── Category pills ───────────────────────────────────────── */}
        <div
          className="flex gap-2 overflow-x-auto py-6"
          style={{ scrollbarWidth: "none" }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              aria-pressed={activeCategory === cat}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                activeCategory === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Product count ─────────────────────────────────────────── */}
        <div className="mb-5 flex items-center justify-between">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            {isLoading
              ? "Cargando…"
              : `${visibleProducts.length} pieza${visibleProducts.length !== 1 ? "s" : ""}`}
          </p>

          {/* Reset filter chip — visible only when a category is active */}
          {activeCategory !== "Todo" && !isLoading && (
            <button
              onClick={() => setActiveCategory("Todo")}
              className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Ver todo
            </button>
          )}
        </div>

        {/* ── Error state (products fetch failed) ───────────────────── */}
        {!isLoading && isProductsError && (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <AlertCircle className="h-10 w-10 text-destructive/40" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Error al cargar el catálogo
              </p>
              <p className="text-xs text-muted-foreground">
                Verificá tu conexión a internet e intentá de nuevo.
              </p>
            </div>
          </div>
        )}

        {/* ── Skeleton grid ─────────────────────────────────────────── */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Product grid ──────────────────────────────────────────── */}
        {!isLoading && !isProductsError && visibleProducts.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                stockQty={stockIndex[product.id] ?? 0}
                cartQty={cartIndex[product.id]   ?? 0}
                onAdd={handleAdd}
              />
            ))}
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {!isLoading && !isProductsError && visibleProducts.length === 0 && (
          <div className="flex flex-col items-center gap-6 py-24 text-center">
            <IsotipoFade />

            {activeCategory !== "Todo" ? (
              <>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-foreground">
                    Sin piezas en esta categoría
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Probá explorar toda la colección.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full px-6 text-xs tracking-widest uppercase"
                  onClick={() => setActiveCategory("Todo")}
                >
                  Ver toda la colección
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-foreground">
                    La colección se está renovando
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Volvé pronto para ver las nuevas piezas.
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full px-6 text-xs tracking-widest uppercase"
                >
                  <Link href="/shop">Explorar Colección</Link>
                </Button>
              </>
            )}
          </div>
        )}

      </div>

      {/* ── Floating cart ─────────────────────────────────────────────── */}
      <CartPanel />
    </main>
  );
}
