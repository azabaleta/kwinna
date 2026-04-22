import { create } from "zustand";
import type { Product } from "@kwinna/contracts";

export interface CartItem {
  product:   Product;
  quantity:  number;
  size?:     string;
}

export interface CustomerForm {
  name:     string;
  lastName: string;
  dni:      string;
  email:    string;
  phone:    string;
  address:  string;
  city:     string;
  province: string;
}

interface PosState {
  // Cart
  cart:        CartItem[];
  addToCart:   (product: Product, size?: string) => void;
  removeFromCart: (productId: string, size?: string) => void;
  updateQty:   (productId: string, size: string | undefined, delta: number) => void;
  clearCart:   () => void;

  // Customer
  customer:       CustomerForm;
  setCustomer:    (data: Partial<CustomerForm>) => void;
  resetCustomer:  () => void;

  // POS metadata
  paymentMethod:    string;
  saleNotes:        string;
  setPaymentMethod: (v: string) => void;
  setSaleNotes:     (v: string) => void;
}

const emptyCustomer: CustomerForm = {
  name: "", lastName: "", dni: "", email: "", phone: "",
  address: "", city: "", province: "",
};

function cartKey(productId: string, size?: string): string {
  return `${productId}:${size ?? ""}`;
}

export const usePosStore = create<PosState>((set) => ({
  cart: [],

  addToCart: (product, size) =>
    set((s) => {
      const key = cartKey(product.id, size);
      const existing = s.cart.find(
        (i) => cartKey(i.product.id, i.size) === key
      );
      if (existing) {
        return {
          cart: s.cart.map((i) =>
            cartKey(i.product.id, i.size) === key
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return { cart: [...s.cart, { product, quantity: 1, size }] };
    }),

  removeFromCart: (productId, size) =>
    set((s) => ({
      cart: s.cart.filter(
        (i) => cartKey(i.product.id, i.size) !== cartKey(productId, size)
      ),
    })),

  updateQty: (productId, size, delta) =>
    set((s) => {
      const key = cartKey(productId, size);
      const updated = s.cart
        .map((i) =>
          cartKey(i.product.id, i.size) === key
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i
        )
        .filter((i) => i.quantity > 0);
      return { cart: updated };
    }),

  clearCart: () => set({ cart: [] }),

  customer:      emptyCustomer,
  setCustomer:   (data) => set((s) => ({ customer: { ...s.customer, ...data } })),
  resetCustomer: () => set({ customer: emptyCustomer }),

  paymentMethod:    "",
  saleNotes:        "",
  setPaymentMethod: (v) => set({ paymentMethod: v }),
  setSaleNotes:     (v) => set({ saleNotes: v }),
}));
