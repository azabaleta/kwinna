import type { Product, Stock } from "@kwinna/contracts";

// ─── Factories ────────────────────────────────────────────────────────────────
// Estructura jerárquica: invalidar el nivel padre invalida todos los hijos.
// Ej: queryClient.invalidateQueries({ queryKey: stockKeys.all })
//     invalida tanto la lista como los detalles por productId.

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  detail: (id: Product["id"]) => [...productKeys.all, "detail", id] as const,
};

export const stockKeys = {
  all: ["stock"] as const,
  lists: () => [...stockKeys.all, "list"] as const,
  detail: (productId: Stock["productId"]) =>
    [...stockKeys.all, "detail", productId] as const,
};

export const saleKeys = {
  all: ["sales"] as const,
};
