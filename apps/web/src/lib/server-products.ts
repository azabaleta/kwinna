/**
 * Fetch de productos para Server Components (no usa apiClient ni Zustand).
 * Usa la variable de entorno server-only API_URL (fallback: NEXT_PUBLIC_API_URL).
 * Si la petición falla (p.ej. en desarrollo con mocks), devuelve undefined
 * para que ShopClientView recaiga en TanStack Query + MSW del cliente.
 */

import { ProductListResponseSchema, type Product } from "@kwinna/contracts";

const SERVER_API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function fetchProductsSSR(): Promise<Product[] | undefined> {
  try {
    const res = await fetch(`${SERVER_API_URL}/products`, {
      // ISR: la respuesta se cachea en el servidor de Next.js y se revalida
      // cada 60 s. Evita un fetch por request sin sacrificar frescura del catálogo.
      next: { revalidate: 60 },
    });

    if (!res.ok) return undefined;

    const json = await res.json();
    const parsed = ProductListResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : undefined;
  } catch {
    // API caída o dev en modo mock → el cliente lo resuelve solo
    return undefined;
  }
}
