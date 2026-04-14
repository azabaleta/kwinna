"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { Product } from "@kwinna/contracts";
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
  const outOfStock = stockQty === 0;
  const maxReached = !outOfStock && cartQty >= stockQty;
  const disabled   = outOfStock || maxReached;
  const remaining  = stockQty - cartQty;
  const lowStock   = !outOfStock && remaining <= 5 && remaining > 0;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--radius)] bg-card transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-soft",
        outOfStock && "opacity-70",
      )}
    >
      {/* ── Image / placeholder — clickable area → PDP ───────────────── */}
      <Link href={`/shop/${product.id}`} tabIndex={-1} aria-hidden="true" className="contents">
      <div
        className={cn(
          "relative aspect-[3/4] overflow-hidden bg-gradient-to-b",
          getGradient(product.id),
        )}
      >
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center text-primary/10 transition-transform duration-500 group-hover:scale-110">
          <IsotipoWatermark />
        </div>

        {/* Cart badge */}
        {cartQty > 0 && (
          <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary-foreground shadow-soft">
            <ShoppingBag className="h-2.5 w-2.5" />
            {cartQty}
          </div>
        )}

        {/* Low stock chip */}
        {lowStock && (
          <div className="absolute right-2.5 top-2.5 z-10 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white shadow-soft">
            Últimas {remaining}
          </div>
        )}

        {/* Out-of-stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 z-10 flex items-end justify-center bg-background/50 backdrop-blur-[2px] pb-6">
            <span className="rounded-full bg-card/90 px-3 py-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Agotado
            </span>
          </div>
        )}

        {/* Hover add-to-cart overlay */}
        {!disabled && (
          <button
            onClick={() => onAdd(product)}
            className="absolute inset-x-0 bottom-0 z-10 translate-y-full py-3 bg-primary text-primary-foreground text-xs font-semibold tracking-widest uppercase transition-transform duration-300 group-hover:translate-y-0 focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={`Añadir ${product.name} al carrito`}
          >
            Añadir al carrito
          </button>
        )}
      </div>
      </Link>

      {/* ── Info — also links to PDP ──────────────────────────────────── */}
      <Link href={`/shop/${product.id}`} className="flex flex-col gap-1 px-3 py-3 hover:no-underline">
        <h3 className="line-clamp-1 text-[13px] font-semibold leading-snug tracking-wide text-foreground">
          {product.name}
        </h3>
        {product.description && (
          <p className="line-clamp-1 text-[11px] leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}
        <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
          ${product.price.toLocaleString("es-AR")}
        </p>
      </Link>

      {/* ── Always-visible CTA (mobile — no hover) ───────────────────── */}
      <div className="px-3 pb-3 sm:hidden">
        <button
          onClick={() => !disabled && onAdd(product)}
          disabled={disabled}
          className={cn(
            "w-full rounded-full py-2 text-[11px] font-semibold tracking-widest uppercase transition-colors",
            disabled
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground active:opacity-80",
          )}
        >
          {outOfStock ? "Agotado" : maxReached ? "Máx. alcanzado" : "Añadir"}
        </button>
      </div>
    </article>
  );
}
