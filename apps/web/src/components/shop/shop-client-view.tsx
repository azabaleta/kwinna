"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ChevronDown, SearchX, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Product } from "@kwinna/contracts";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProducts } from "@/hooks/use-products";
import { useStock } from "@/hooks/use-stock";
import { selectCartItems, useCartStore } from "@/store/use-cart-store";
import { useAuthStore } from "@/store/use-auth-store";
import { trackEvent } from "@/services/analytics";
import { ProductCard } from "@/components/shop/product-card";
import { CartPanel } from "@/components/shop/cart-panel";
import { cn } from "@/lib/utils";
import { PRODUCT_TAGS } from "@/schemas/product";

// ─── Category filter config ───────────────────────────────────────────────────

const CATEGORIES = ["Todo", ...PRODUCT_TAGS] as const;
type Category = (typeof CATEGORIES)[number];

// ─── Sort config ──────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "relevance",  label: "Relevancia"             },
  { value: "price_asc",  label: "Precio: Menor a Mayor"  },
  { value: "price_desc", label: "Precio: Mayor a Menor"  },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

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

// ─── Isotipo watermark (empty state) ─────────────────────────────────────────

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

// ─── Props ────────────────────────────────────────────────────────────────────
// initialProducts: optional SSR-prefetched products passed from the Server Component.
// When undefined the client fetches them via useProducts (TanStack Query + MSW).

export interface ShopClientViewProps {
  initialProducts?: Product[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ShopClientView({ initialProducts }: ShopClientViewProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // URL es la fuente única de verdad para todos los filtros
  const q              = searchParams.get("q") ?? undefined;
  const categoryParam  = (searchParams.get("category") ?? "Todo") as Category;
  const activeCategory = CATEGORIES.includes(categoryParam) ? categoryParam : "Todo";
  const sortParam      = (searchParams.get("sort") ?? "relevance") as SortValue;
  const activeSort     = SORT_OPTIONS.some((o) => o.value === sortParam) ? sortParam : "relevance";

  function handleCategoryChange(cat: Category) {
    const params = new URLSearchParams(searchParams.toString());
    if (cat === "Todo") {
      params.delete("category");
    } else {
      params.set("category", cat);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleSortChange(value: SortValue) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "relevance") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const {
    products,
    isLoading: loadingProducts,
    isError: isProductsError,
  } = useProducts(q);

  const {
    stock,
    isLoading: loadingStock,
    isError: isStockError,
  } = useStock();

  const cartItems       = useCartStore(selectCartItems);
  const addItem         = useCartStore((s) => s.addItem);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Prefer SSR-prefetched data while the client query is still loading
  const resolvedProducts = loadingProducts && initialProducts ? initialProducts : products;
  const isLoading = loadingProducts || loadingStock;

  // ── shop_view — una vez por sesión al montar ─────────────────────────────

  useEffect(() => { trackEvent("shop_view"); }, []);

  // ── Error toasts ─────────────────────────────────────────────────────────

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

  // ── Category filtering ───────────────────────────────────────────────────

  const filteredProducts =
    activeCategory === "Todo"
      ? resolvedProducts
      : resolvedProducts.filter((p) =>
          p.tags.some((t) => t.toLowerCase() === activeCategory.toLowerCase()),
        );

  // ── Sort ─────────────────────────────────────────────────────────────────
  // Copia superficial para no mutar el array original del store/query.

  const visibleProducts = [...filteredProducts].sort((a, b) => {
    if (activeSort === "price_asc")  return a.price - b.price;
    if (activeSort === "price_desc") return b.price - a.price;
    return 0; // "relevance" → orden original del servidor
  });

  // ── O(1) lookup indices ──────────────────────────────────────────────────

  // Suma todas las filas del mismo productId (una por talle) para obtener
  // el stock total disponible del producto, independientemente del talle.
  const stockIndex = stock.reduce<Record<string, number>>((acc, s) => {
    acc[s.productId] = (acc[s.productId] ?? 0) + s.quantity;
    return acc;
  }, {});
  const cartIndex  = Object.fromEntries(cartItems.map((i) => [i.product.id, i.quantity]));

  // ── Add to cart ──────────────────────────────────────────────────────────

  function handleAdd(product: Product) {
    if (!isAuthenticated) {
      toast.info("Iniciá sesión para agregar al carrito");
      router.push("/login");
      return;
    }

    const stockQty = stockIndex[product.id] ?? 0;
    const inCart   = cartIndex[product.id]  ?? 0;

    if (inCart >= stockQty) {
      toast.error("Sin stock disponible", { description: product.name });
      return;
    }

    addItem(product);
    trackEvent("cart_add");
    toast.success("Añadido al carrito", { description: product.name });
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-background pb-32">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/50 h-[600px] md:h-[70vh] min-h-[500px]">
        <Image priority src="/images/hero-desktop.png" alt="Hero Desktop" fill className="hidden md:block object-cover object-center" />
        <Image priority src="/images/hero-mobile.jpeg" alt="Hero Mobile" fill className="block md:hidden object-cover object-top" />
        <div className="absolute inset-0 bg-black/30 md:bg-gradient-to-r md:from-black/60 md:to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-5xl px-4 md:px-8">
            <p className="mb-2 text-xs font-semibold tracking-[0.25em] text-white/80 uppercase drop-shadow-sm">
              Nueva Temporada
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl drop-shadow-sm">
              Tu movimiento, TU CUERPO, TU CALZA IDEAL, tu outfit.
            </h1>
            <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-white/90 drop-shadow-sm">
              Indumentaria sin etiquetas para mujeres reales. Del entrenamiento a tu rutina diaria, encontrá la comodidad que tu cuerpo merece, en kwinna.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </section>

      <div className="mx-auto max-w-5xl px-4 md:px-8">

        {/* ── Search + Category + Sort ──────────────────────────────── */}
        <div className="flex items-center gap-2 py-6 border-b border-border/50">
          <SearchBar placeholder="Buscar piezas…" className="flex-1 min-w-0" />

          {/* Category dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-none border px-3 h-9 text-xs font-medium tracking-wide transition-colors focus-visible:outline-none",
                  activeCategory !== "Todo"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground",
                )}
              >
                <SlidersHorizontal className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">
                  {activeCategory === "Todo" ? "Categoría" : activeCategory}
                </span>
                {activeCategory !== "Todo" ? (
                  <X
                    className="h-3 w-3 shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleCategoryChange("Todo"); }}
                  />
                ) : (
                  <ChevronDown className="h-3 w-3 shrink-0" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-72 w-48 overflow-y-auto"
            >
              {CATEGORIES.filter((c) => c !== "Todo").map((cat) => (
                <DropdownMenuItem
                  key={cat}
                  onSelect={() => handleCategoryChange(cat)}
                  className={cn(
                    "text-xs cursor-pointer",
                    activeCategory === cat && "font-semibold text-foreground bg-accent",
                  )}
                >
                  {activeCategory === cat && (
                    <span className="mr-1.5 text-foreground">✓</span>
                  )}
                  {cat}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <Select value={activeSort} onValueChange={handleSortChange}>
            <SelectTrigger className="h-9 w-auto shrink-0 text-xs px-3 gap-1.5">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent align="end">
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Product count ─────────────────────────────────────────── */}
        <div className="mb-5 flex items-center justify-between">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            {isLoading
              ? "Cargando…"
              : q
              ? `${visibleProducts.length} resultado${visibleProducts.length !== 1 ? "s" : ""} para "${q}"`
              : `${visibleProducts.length} pieza${visibleProducts.length !== 1 ? "s" : ""}`}
          </p>

          {activeCategory !== "Todo" && !isLoading && (
            <button
              onClick={() => handleCategoryChange("Todo")}
              className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Ver todo
            </button>
          )}
        </div>

        {/* ── Error state ───────────────────────────────────────────── */}
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
            <AnimatePresence mode="popLayout">
              {visibleProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  className="h-full"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <ProductCard
                    product={product}
                    stockQty={stockIndex[product.id] ?? 0}
                    cartQty={cartIndex[product.id]   ?? 0}
                    onAdd={handleAdd}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {!isLoading && !isProductsError && visibleProducts.length === 0 && (
          <div className="flex flex-col items-center gap-6 py-24 text-center">

            {q ? (
              <>
                <SearchX className="h-12 w-12 text-primary/20" strokeWidth={1.25} />
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-foreground">
                    Sin resultados para "{q}"
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Intentá con otro término o explorá toda la colección.
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full px-6 text-xs tracking-widest uppercase"
                >
                  <Link href="/shop">Ver toda la colección</Link>
                </Button>
              </>
            ) : activeCategory !== "Todo" ? (
              <>
                <IsotipoFade />
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
                  onClick={() => handleCategoryChange("Todo")}
                >
                  Ver toda la colección
                </Button>
              </>
            ) : (
              <>
                <IsotipoFade />
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
