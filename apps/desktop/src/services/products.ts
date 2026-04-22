import { api } from "../lib/api";
import type { Product, ProductListResponse } from "@kwinna/contracts";

export async function fetchProducts(): Promise<Product[]> {
  const res = await api.get<ProductListResponse>("/products");
  return res.data;
}

export async function fetchProductBySku(sku: string): Promise<Product | null> {
  const all = await fetchProducts();
  return all.find((p) => p.sku.toLowerCase() === sku.toLowerCase()) ?? null;
}
