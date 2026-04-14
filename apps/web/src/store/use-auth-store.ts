import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@kwinna/contracts";
import { setAuthCookie, clearAuthCookie } from "@/lib/cookies";

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
        // Sincroniza con la cookie para que middleware.ts pueda leerla (server-side).
        // Guard SSR: cookies.ts usa `document.cookie`, solo disponible en el browser.
        if (typeof window !== "undefined") setAuthCookie(token);
        set({ user, token, isAuthenticated: true });
      },

      clearSession: () => {
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
