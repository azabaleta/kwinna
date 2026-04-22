import axios, { AxiosError, type AxiosResponse } from "axios";
import { useAuthStore } from "@/store/use-auth-store";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

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

// ─── Response: extrae mensajes de error + auto-logout en 401 ─────────────────
// Convierte AxiosError en Error estándar usando response.data.error cuando
// está disponible, para que todos los catch reciban err.message legible.

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ error?: string }>) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      useAuthStore.getState().clearSession();
      window.location.replace("/login");
    }

    const apiMessage = error.response?.data?.error;
    if (apiMessage && error.response) {
      return Promise.reject(new ApiError(apiMessage, error.response.status));
    }

    return Promise.reject(error);
  }
);

export default apiClient;
