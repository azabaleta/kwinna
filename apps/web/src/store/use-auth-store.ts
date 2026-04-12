import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@kwinna/contracts";

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
        // Sincroniza con la cookie para que middleware.ts pueda leerla (server-side)
        if (typeof window !== "undefined") {
          const { setAuthCookie } = require("@/lib/cookies") as typeof import("@/lib/cookies");
          setAuthCookie(token);
        }
        set({ user, token, isAuthenticated: true });
      },

      clearSession: () => {
        if (typeof window !== "undefined") {
          const { clearAuthCookie } = require("@/lib/cookies") as typeof import("@/lib/cookies");
          clearAuthCookie();
        }
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
