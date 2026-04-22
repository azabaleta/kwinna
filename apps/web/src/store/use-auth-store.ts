import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@kwinna/contracts";
import { setAuthCookie, clearAuthCookie } from "@/lib/cookies";
import { useCartStore } from "@/store/use-cart-store";
import { useWishlistStore } from "@/store/use-wishlist-store";

// ─── State shape ──────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  setSession: (user: User, token: string) => void;
  clearSession: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setSession: (user, token) => {
        // Limpia carrito y favoritos antes de establecer la sesión — cada
        // usuario siempre arranca limpio, sin ver datos de otra sesión.
        useCartStore.getState().clearCart();
        useWishlistStore.getState().clearWishlist();
        if (typeof window !== "undefined") setAuthCookie(token);
        set({ user, token, isAuthenticated: true });
      },

      clearSession: () => {
        // Limpia carrito y favoritos al cerrar sesión.
        useCartStore.getState().clearCart();
        useWishlistStore.getState().clearWishlist();
        if (typeof window !== "undefined") clearAuthCookie();
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "kwinna-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectToken = (state: AuthState & AuthActions) => state.token;
export const selectUser = (state: AuthState & AuthActions) => state.user;
export const selectIsAuthenticated = (state: AuthState & AuthActions) =>
  state.isAuthenticated;
