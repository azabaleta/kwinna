import axios, { AxiosError, type AxiosResponse } from "axios";
import { useAuthStore } from "@/store/use-auth-store";

// No circular dependency: axios.ts → useAuthStore, useAuthStore → cookies.ts.
// El require() dinámico anterior era una precaución innecesaria.

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
});

// ─── Request: inyecta token desde el store ────────────────────────────────────

apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response: auto-logout en 401 ────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      useAuthStore.getState().clearSession();
      window.location.replace("/login");
    }
    return Promise.reject(error);
  }
);

export default apiClient;
