/** Format a number as ARS currency */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format ISO date string to locale date */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** Normalize string for fuzzy comparison */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Simple contains-based search across name and SKU */
export function matchProduct(name: string, sku: string, query: string): boolean {
  if (!query) return true;
  const q = normalize(query);
  return normalize(name).includes(q) || normalize(sku).includes(q);
}
