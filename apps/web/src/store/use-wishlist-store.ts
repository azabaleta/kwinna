import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product } from "@kwinna/contracts";

// ─── WishlistItem ─────────────────────────────────────────────────────────────

export interface WishlistItem {
  product:  Product;
  addedAt:  number; // timestamp ms — para ordenar por fecha de guardado
}

// ─── State & Actions ──────────────────────────────────────────────────────────

interface WishlistState {
  items:       WishlistItem[];
  hasHydrated: boolean;
}

interface WishlistActions {
  /** Agrega el producto si no está, lo quita si ya está. */
  toggleItem:     (product: Product) => void;
  /** Quita un producto por ID. */
  removeItem:     (productId: string) => void;
  /** Vacía la lista completa. */
  clearWishlist:  () => void;
  /** Llamado internamente por onRehydrateStorage. */
  setHasHydrated: (value: boolean) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWishlistStore = create<WishlistState & WishlistActions>()(
  persist(
    (set) => ({
      items:       [],
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      toggleItem: (product) =>
        set((state) => {
          const exists = state.items.some((i) => i.product.id === product.id);
          return exists
            ? { items: state.items.filter((i) => i.product.id !== product.id) }
            : { items: [...state.items, { product, addedAt: Date.now() }] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        })),

      clearWishlist: () => set({ items: [] }),
    }),
    {
      name:    "kwinna-wishlist",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectWishlistItems    = (s: WishlistState & WishlistActions) => s.items;
export const selectWishlistHydrated = (s: WishlistState & WishlistActions) => s.hasHydrated;
export const selectWishlistCount    = (s: WishlistState & WishlistActions) => s.items.length;
