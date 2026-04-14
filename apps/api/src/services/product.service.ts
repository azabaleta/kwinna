import type { Product, ProductCreateInput } from "@kwinna/contracts";
import { findAllProducts, findProductById, insertProduct } from "../db/repositories";

export async function getAllProducts(): Promise<Product[]> {
  return findAllProducts();
}

export async function getProductById(id: string): Promise<Product | undefined> {
  return findProductById(id);
}

export async function createProduct(input: ProductCreateInput): Promise<Product> {
  return insertProduct(input);
}
