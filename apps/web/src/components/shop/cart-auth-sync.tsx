"use client";

import { useEffect } from "react";
import { selectHasHydrated, useCartStore } from "@/store/use-cart-store";
import { selectWishlistHydrated, useWishlistStore } from "@/store/use-wishlist-store";
import { useAuthStore } from "@/store/use-auth-store";

/**
 * Vacía carrito y favoritos cuando los stores se rehidratan y no hay sesión.
 * Cubre el caso donde localStorage tiene datos de una sesión anterior pero
 * el usuario abrió el browser sin estar autenticado (token expirado, etc.).
 * No renderiza nada — es solo lógica de sincronización.
 */
export function CartAuthSync() {
  const cartHydrated     = useCartStore(selectHasHydrated);
  const cartItems        = useCartStore((s) => s.items);
  const clearCart        = useCartStore((s) => s.clearCart);

  const wishlistHydrated = useWishlistStore(selectWishlistHydrated);
  const wishlistItems    = useWishlistStore((s) => s.items);
  const clearWishlist    = useWishlistStore((s) => s.clearWishlist);

  const isAuthenticated  = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      if (cartHydrated && cartItems.length > 0)       clearCart();
      if (wishlistHydrated && wishlistItems.length > 0) clearWishlist();
    }
  }, [
    isAuthenticated,
    cartHydrated, cartItems.length, clearCart,
    wishlistHydrated, wishlistItems.length, clearWishlist,
  ]);

  return null;
}
