import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product } from "@kwinna/contracts";

// ─── CartItem ─────────────────────────────────────────────────────────────────
// Tipo frontend-only. El contrato de API usa SaleItem (productId + unitPrice…)
// La conversión CartItem → SaleItem ocurre al momento de registrar la venta.
// size es opcional: undefined para productos sin variante de talle.
// La clave de línea es (product.id + size) — misma prenda en otro talle = otra fila.

export interface CartItem {
  product:  Product;
  quantity: number;
  size?:    string;
}

/** Clave de línea única dentro del carrito. */
function lineKey(productId: string, size?: string): string {
  return `${productId}::${size ?? ""}`;
}

// ─── State & Actions ──────────────────────────────────────────────────────────

interface CartState {
  items: CartItem[];
}

interface CartActions {
  /** Agrega el producto al carrito. Si ya existe la misma (product, size), incrementa la cantidad. */
  addItem: (product: Product, quantity?: number, size?: string) => void;
  /** Elimina toda la línea (product, size) del carrito. */
  removeItem: (productId: string, size?: string) => void;
  /** Vacía el carrito por completo. */
  clearCart: () => void;
  /** Precio total del carrito (suma de price × quantity por ítem). */
  getTotal: () => number;
  /** Cantidad total de unidades en el carrito (suma de todas las quantities). */
  getItemCount: () => number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1, size) => {
        set((state) => {
          const key = lineKey(product.id, size);
          const existing = state.items.find(
            (i) => lineKey(i.product.id, i.size) === key
          );

          if (existing) {
            return {
              items: state.items.map((i) =>
                lineKey(i.product.id, i.size) === key
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }

          return { items: [...state.items, { product, quantity, size }] };
        });
      },

      removeItem: (productId, size) => {
        const key = lineKey(productId, size);
        set((state) => ({
          items: state.items.filter(
            (i) => lineKey(i.product.id, i.size) !== key
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotal: () =>
        get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),

      getItemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "kwinna-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectCartItems = (state: CartState & CartActions) => state.items;

export const selectItemCount = (state: CartState & CartActions) =>
  state.items.reduce((sum, i) => sum + i.quantity, 0);

export const selectCartTotal = (state: CartState & CartActions) =>
  state.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
