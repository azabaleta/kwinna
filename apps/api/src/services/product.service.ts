import bcrypt from "bcryptjs";
import type { Product, ProductBulkInput, ProductCreateInput, ProductQuery, ProductUpdateInput } from "@kwinna/contracts";
import {
  bulkInsertProductsAndStock,
  deleteProductById,
  findAllProducts,
  findProductById,
  insertProduct,
  updateProduct,
} from "../db/repositories";
import { findUserById } from "../db/repositories/user.repository";

function httpError(message: string, status: number): Error {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = status;
  return err;
}

export async function getAllProducts(query?: ProductQuery): Promise<Product[]> {
  return findAllProducts(query);
}

export async function getProductById(id: string): Promise<Product | undefined> {
  return findProductById(id);
}

export async function createProduct(input: ProductCreateInput): Promise<Product> {
  return insertProduct(input);
}

export async function updateProductData(
  id: string,
  input: ProductUpdateInput,
): Promise<Product> {
  const existing = await findProductById(id);
  if (!existing) throw httpError("Producto no encontrado", 404);

  const updated = await updateProduct(id, input);
  if (!updated) throw httpError("No se pudo actualizar el producto", 500);

  return updated;
}

export async function deleteProduct(
  id: string,
  requesterId: string,
  password: string,
): Promise<void> {
  const product = await findProductById(id);
  if (!product) throw httpError("Producto no encontrado", 404);

  const requester = await findUserById(requesterId);
  if (!requester) throw httpError("Usuario no encontrado", 404);

  const match = await bcrypt.compare(password, requester.passwordHash);
  if (!match) throw httpError("Contraseña incorrecta", 401);

  await deleteProductById(id);
}

export async function bulkCreateProducts(
  input: ProductBulkInput,
): Promise<{ created: number; skipped: number; products: Product[] }> {
  return bulkInsertProductsAndStock(input.items);
}
