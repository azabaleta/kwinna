import type { Product, Stock } from "@kwinna/contracts";

// ─── Factories ────────────────────────────────────────────────────────────────
// Estructura jerárquica: invalidar el nivel padre invalida todos los hijos.
// Ej: queryClient.invalidateQueries({ queryKey: stockKeys.all })
//     invalida tanto la lista como los detalles por productId.

export const productKeys = {
  all:    ["products"] as const,
  lists:  (q?: string) => [...productKeys.all, "list", q ?? ""] as const,
  detail: (id: Product["id"]) => [...productKeys.all, "detail", id] as const,
};

export const stockKeys = {
  all:       ["stock"] as const,
  lists:     () => [...stockKeys.all, "list"] as const,
  detail:    (productId: Stock["productId"]) => [...stockKeys.all, "detail", productId] as const,
  movements: (from: string, to: string) => [...stockKeys.all, "movements", from, to] as const,
};

export const saleKeys = {
  all:   ["sales"] as const,
  lists: () => [...saleKeys.all, "list"] as const,
  detail: (id: string) => [...saleKeys.all, "detail", id] as const,
};

export const customerKeys = {
  all:   ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
};
