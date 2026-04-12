import type { Product } from "@kwinna/contracts";
import { products } from "../db/seed";

export function getAllProducts(): Product[] {
  return products;
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
