"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { selectItemCount, useCartStore } from "@/store/use-cart-store";

export function CartButton() {
  const count = useCartStore(selectItemCount);

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/checkout" className="gap-2">
          <ShoppingBag className="h-4 w-4" />
          <span className="hidden text-[11px] font-semibold tracking-widest uppercase sm:inline">
            Carrito
          </span>
        </Link>
      </Button>

      {count > 0 && (
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold leading-none text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </div>
  );
}
