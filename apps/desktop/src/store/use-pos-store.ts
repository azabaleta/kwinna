import { create } from "zustand";
import type { Product, PriceTier, ReturnReason } from "@kwinna/contracts";

export interface CartItem {
  product:   Product;
  quantity:  number;
  size?:     string;
}

// Artículo fuera de catálogo ingresado a mano en el POS
export interface CustomCartItem {
  id:          string;   // clave de carrito generada en cliente (no va a la API)
  description: string;
  unitPrice:   number;
  quantity:    number;
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
  // Cart — productos del catálogo
  cart:           CartItem[];
  addToCart:      (product: Product, size?: string) => void;
  removeFromCart: (productId: string, size?: string) => void;
  updateQty:      (productId: string, size: string | undefined, delta: number) => void;
  clearCart:      () => void;

  // Custom items — artículos libres sin catálogo
  customItems:       CustomCartItem[];
  addCustomItem:     (item: { description: string; unitPrice: number }) => void;
  removeCustomItem:  (id: string) => void;
  updateCustomQty:   (id: string, delta: number) => void;

  // Customer
  customer:       CustomerForm;
  setCustomer:    (data: Partial<CustomerForm>) => void;
  resetCustomer:  () => void;

  // POS metadata
  paymentMethod:    string;
  saleNotes:        string;
  setPaymentMethod: (v: string) => void;
  setSaleNotes:     (v: string) => void;

  priceTier:    PriceTier;
  setPriceTier: (t: PriceTier) => void;

  // Crédito de devolución — se activa desde ReturnView y se consume en SellView
  returnCredit: {
    amount:         number;
    reason?:        ReturnReason;
    customerName?:  string;
    creditNoteId:   string;   // ID de la nota en la BD
    creditNoteCode: string;   // Código legible, ej: "NC-A3X7K"
  } | null;
  setReturnCredit: (credit: {
    amount:         number;
    reason?:        ReturnReason;
    customerName?:  string;
    creditNoteId:   string;
    creditNoteCode: string;
  } | null) => void;
}

const emptyCustomer: CustomerForm = {
  name: "", lastName: "", dni: "", email: "", phone: "",
  address: "", city: "", province: "",
};

function cartKey(productId: string, size?: string): string {
  return `${productId}:${size ?? ""}`;
}

export const usePosStore = create<PosState>((set) => ({
  cart:        [],
  customItems: [],

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

  clearCart: () => set({ cart: [], customItems: [], returnCredit: null }),

  addCustomItem: ({ description, unitPrice }) =>
    set((s) => ({
      customItems: [
        ...s.customItems,
        {
          // ID solo para clave de carrito; nunca se envía a la API
          id:          `libre-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
          description,
          unitPrice,
          quantity: 1,
        },
      ],
    })),

  removeCustomItem: (id) =>
    set((s) => ({
      customItems: s.customItems.filter((ci) => ci.id !== id),
    })),

  updateCustomQty: (id, delta) =>
    set((s) => ({
      customItems: s.customItems
        .map((ci) =>
          ci.id === id ? { ...ci, quantity: Math.max(0, ci.quantity + delta) } : ci
        )
        .filter((ci) => ci.quantity > 0),
    })),

  customer:      emptyCustomer,
  setCustomer:   (data) => set((s) => ({ customer: { ...s.customer, ...data } })),
  resetCustomer: () => set({ customer: emptyCustomer }),

  paymentMethod:    "",
  saleNotes:        "",
  setPaymentMethod: (v) => set({ paymentMethod: v }),
  setSaleNotes:     (v) => set({ saleNotes: v }),

  priceTier:    "lista",
  setPriceTier: (t) => set({ priceTier: t }),

  returnCredit:    null,
  setReturnCredit: (credit) => set({ returnCredit: credit }),
}));
