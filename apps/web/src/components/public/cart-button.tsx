"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { selectItemCount, useCartStore } from "@/store/use-cart-store";
import { useAuthStore } from "@/store/use-auth-store";

export function CartButton() {
  const router          = useRouter();
  const count           = useCartStore(selectItemCount);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  function handleCheckout() {
    if (!isAuthenticated) {
      toast.info("Iniciá sesión para continuar con la compra");
      router.push("/login");
      return;
    }
    router.push("/checkout");
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={handleCheckout} className="gap-2">
        <ShoppingCart className="h-4 w-4" />
        <span className="hidden text-[11px] font-semibold tracking-widest uppercase sm:inline">
          Carrito
        </span>
      </Button>

      {count > 0 && (
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold leading-none text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </div>
  );
}
