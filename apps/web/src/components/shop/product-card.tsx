"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Heart, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@kwinna/contracts";
import { useAuthStore } from "@/store/use-auth-store";
import { useWishlistStore } from "@/store/use-wishlist-store";
import { cn } from "@/lib/utils";

// ─── Gradient system — deterministic from product ID ──────────────────────────

const GRADIENTS = [
  "from-primary/30 via-primary/10 to-transparent",
  "from-[#E5DACE]/40 via-[#E5DACE]/10 to-transparent",
  "from-primary/20 via-[#E5DACE]/15 to-transparent",
  "from-[#E5DACE]/30 via-primary/10 to-transparent",
] as const;

function getGradient(id: string): string {
  const idx = id.charCodeAt(id.length - 1) % GRADIENTS.length;
  return GRADIENTS[idx] ?? GRADIENTS[0]!;
}

// ─── Isotipo watermark (no SVGR) ──────────────────────────────────────────────

function IsotipoWatermark() {
  return (
    <svg
      viewBox="0 0 976.91 524.76"
      xmlns="http://www.w3.org/2000/svg"
      className="h-14 w-14"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M280.26.28c-103.19-5.26-103.52,64.28-100.34,144.94,0,0,0,159.8,0,159.8,0,34.84-28.34,63.18-63.18,63.18-36.08,1.89-67.01-26.9-66.89-63.18,0,0,0-163.52,0-163.52H1.54c4.57,95.06-34.55,271.9,111.49,275,62.84,2.01,115.32-48.53,115.2-111.49.94-46.4-.68-182.32,0-226.69-.39-28.27,30.18-32.02,52.03-29.73,16.39,0,29.73,13.33,29.73,29.73,0,0,0,66.89,0,66.89v234.13c-3.44,80.06-2.32,150.68,100.34,144.94,80.66-4.35,81.12-74.96,78.04-137.5,0,0,0-7.43,0-7.43v-144.94c1.16-83.55,128.9-83.61,130.07,0,0,0,0,144.93,0,144.93,0,0,0,7.43,0,7.43-3.19,62.29-2.43,133.4,78.05,137.5,78.95,5.85,106.97-42.04,100.33-115.21-.27-17.31.2-153.84,0-174.67,0-34.84,28.34-63.18,63.18-63.18,36.07-1.89,67.02,26.9,66.89,63.18,0,0,0,174.67,0,174.67h48.31c-5.86-95.66,37.94-283.44-111.49-286.15-62.84-2-115.32,48.53-115.2,111.49-.59,46.99.42,166.6,0,211.83.39,28.27-30.18,32.02-52.03,29.73-16.39,0-29.73-13.33-29.73-29.73.24-43.6-.17-166.45,0-211.83.12-62.95-52.37-113.49-115.21-111.49-140.61,4.61-108.86,161.91-111.49,256.43-.38,3.51.27,61.97,0,66.89.39,28.27-30.19,32.02-52.04,29.73-16.39,0-29.72-13.34-29.72-29.73,0,0,0-66.89,0-66.89v-234.13c2.23-63.34,6.48-140.61-78.04-144.94"
      />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  stockQty: number;
  cartQty: number;
  onAdd: (product: Product) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductCard({ product, stockQty, cartQty, onAdd }: ProductCardProps) {
  const router          = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const toggleItem      = useWishlistStore((s) => s.toggleItem);
  const inWishlist      = useWishlistStore((s) =>
    s.items.some((i) => i.product.id === product.id)
  );
  const outOfStock  = stockQty === 0;
  const remaining   = stockQty - cartQty;
  const lowStock    = !outOfStock && remaining <= 5 && remaining > 0;

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/shop/${product.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: `$${product.price.toLocaleString("es-AR")} — Kwinna`, url });
      } catch (err) {
        // AbortError = usuario canceló el sheet → no hacer nada
        if (err instanceof Error && err.name !== "AbortError") {
          await navigator.clipboard.writeText(url);
          toast.success("Enlace copiado");
        }
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado", { description: product.name });
    }
  }

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info("Iniciá sesión para guardar favoritos");
      router.push("/login");
      return;
    }
    toggleItem(product);
    toast(inWishlist ? "Eliminado de favoritos" : "Guardado en favoritos", {
      description: product.name,
    });
  }

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden bg-background transition-all duration-300",
        "border border-border/40 hover:border-border",
        outOfStock && "opacity-70",
      )}
    >
      {/* ── Image / placeholder — clickable area → PDP ───────────────── */}
      <div className="relative">
        <Link href={`/shop/${product.id}`} prefetch={true} tabIndex={-1} aria-hidden="true">
        <div
          className={cn(
            "relative aspect-[3/4] overflow-hidden",
            product.images?.[0]
              ? "bg-muted"
              : cn("bg-gradient-to-b", getGradient(product.id)),
          )}
        >
          {/* Product photo — shown when the product has at least one image */}
          {product.images?.[0] && (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className={cn(
                "object-cover transition-all duration-700",
                product.images?.[1] ? "group-hover:opacity-0" : "group-hover:scale-105"
              )}
            />
          )}

          {/* Secondary photo for hover cross-fade */}
          {product.images?.[1] && (
            <Image
              src={product.images[1]}
              alt={`${product.name} detail`}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="absolute inset-0 object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            />
          )}

          {/* Watermark placeholder — shown only when there are no images */}
          {!product.images?.[0] && (
            <div className="absolute inset-0 flex items-center justify-center text-primary/10 transition-transform duration-500 group-hover:scale-110">
              <IsotipoWatermark />
            </div>
          )}

          {/* Cart badge */}
          {cartQty > 0 && !lowStock && (
            <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary-foreground shadow-soft">
              <ShoppingBag className="h-2.5 w-2.5" />
              {cartQty}
            </div>
          )}

          {/* Low stock chip */}
          {lowStock && (
            <div className="absolute left-2.5 top-2.5 z-10 rounded-none bg-amber-500/90 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-white">
              Últimas {remaining}
            </div>
          )}

          {/* Out-of-stock overlay */}
          {outOfStock && (
            <div className="absolute inset-0 z-10 flex items-end justify-center bg-background/50 backdrop-blur-[2px] pb-6">
              <span className="rounded-none bg-card/90 px-3 py-1 text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
                Agotado
              </span>
            </div>
          )}
        </div>
        </Link>

        {/* Wishlist Heart */}
        <button
          className={cn(
            "absolute right-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-none bg-background/50 backdrop-blur-sm transition-all hover:bg-background/80",
            inWishlist ? "text-rose-500" : "text-foreground/60 hover:text-foreground",
          )}
          aria-label={inWishlist ? "Quitar de favoritos" : "Guardar en favoritos"}
          onClick={handleWishlist}
        >
          <Heart className={cn("h-3.5 w-3.5 transition-all", inWishlist && "fill-current")} />
        </button>

        {/* Share — aparece al hacer hover sobre la tarjeta */}
        <button
          className="absolute right-2.5 top-11 z-20 flex h-7 w-7 items-center justify-center rounded-none bg-background/50 backdrop-blur-sm text-foreground/60 opacity-0 transition-all hover:bg-background/80 hover:text-foreground group-hover:opacity-100"
          aria-label="Compartir producto"
          onClick={handleShare}
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Info — also links to PDP ──────────────────────────────────── */}
      <Link href={`/shop/${product.id}`} prefetch={true} className="flex flex-col gap-1 px-3 py-3 hover:no-underline text-center">
        <h3 className="line-clamp-1 text-[11px] font-normal uppercase tracking-[0.05em] leading-snug text-foreground">
          {product.name}
        </h3>
        {product.description && (
          <p className="line-clamp-1 text-[10px] uppercase tracking-widest text-muted-foreground/60">
            {product.description}
          </p>
        )}
        <p className="mt-0.5 text-xs font-normal tracking-wide tabular-nums text-foreground">
          ${product.price.toLocaleString("es-AR")}
        </p>
      </Link>
    </article>
  );
}
