"use client";

import { Heart, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Product } from "@kwinna/contracts";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/product-card";
import { useWishlistStore, selectWishlistItems, selectWishlistHydrated } from "@/store/use-wishlist-store";
import { useCartStore, selectCartItems, selectHasHydrated } from "@/store/use-cart-store";
import { useAuthStore } from "@/store/use-auth-store";
import { useStock } from "@/hooks/use-stock";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="overflow-hidden bg-card border border-border/40">
      <div className="aspect-[3/4] animate-pulse bg-muted" />
      <div className="space-y-2 px-3 py-3">
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FavoritesPage() {
  const router = useRouter();

  const isAuthenticated  = useAuthStore((s) => s.isAuthenticated);
  const wishlistItems    = useWishlistStore(selectWishlistItems);
  const wishlistHydrated = useWishlistStore(selectWishlistHydrated);
  const cartItems        = useCartStore(selectCartItems);
  const cartHydrated     = useCartStore(selectHasHydrated);
  const addItem          = useCartStore((s) => s.addItem);

  const { stock, isLoading: stockLoading } = useStock();

  // Redirige al login si no hay sesión (una vez que los stores hidratan)
  useEffect(() => {
    if (wishlistHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [wishlistHydrated, isAuthenticated, router]);

  const isHydrating = !wishlistHydrated || !cartHydrated || stockLoading;

  // ── O(1) lookup indices ─────────────────────────────────────────────────────

  const stockIndex = stock.reduce<Record<string, number>>((acc, s) => {
    acc[s.productId] = (acc[s.productId] ?? 0) + s.quantity;
    return acc;
  }, {});

  const cartIndex = Object.fromEntries(cartItems.map((i) => [i.product.id, i.quantity]));

  // ── Add to cart ─────────────────────────────────────────────────────────────

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

  // ── Skeleton mientras hidratan ──────────────────────────────────────────────

  if (isHydrating) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="mb-10 h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </main>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (wishlistItems.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-6 text-center">
          <Heart className="h-10 w-10 text-muted-foreground/20" strokeWidth={1.25} />
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground">Tu lista de favoritos está vacía</p>
            <p className="text-sm text-muted-foreground">
              Guardá las piezas que más te gustan para encontrarlas fácil.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="rounded-none px-6 text-xs tracking-widest uppercase"
          >
            <Link href="/shop">Explorar la tienda</Link>
          </Button>
        </div>
      </main>
    );
  }

  // ── Grid ────────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-background px-4 py-10 md:px-8">
      <div className="mx-auto max-w-5xl">

        <Link
          href="/shop"
          className="mb-8 flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a la tienda
        </Link>

        <div className="mb-10 flex items-center gap-3">
          <h1 className="text-xl font-normal uppercase tracking-widest text-foreground">
            Mis favoritos
          </h1>
          <span className="text-sm text-muted-foreground">
            · {wishlistItems.length} {wishlistItems.length === 1 ? "pieza" : "piezas"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {wishlistItems.map(({ product }) => (
            <ProductCard
              key={product.id}
              product={product}
              stockQty={stockIndex[product.id] ?? 0}
              cartQty={cartIndex[product.id]   ?? 0}
              onAdd={handleAdd}
            />
          ))}
        </div>

      </div>
    </main>
  );
}
