import {
  ProductBulkInputSchema,
  ProductBulkResponseSchema,
  ProductCreateInputSchema,
  ProductDeleteInputSchema,
  ProductListResponseSchema,
  ProductResponseSchema,
  type Product,
  type ProductBulkInput,
  type ProductBulkResponse,
  type ProductCreateInput,
  type ProductListResponse,
  type ProductResponse,
} from "@kwinna/contracts";
import type { ProductUpdateFormValues } from "@/schemas/product";
import apiClient from "@/lib/axios";

export async function fetchProducts(q?: string): Promise<ProductListResponse> {
  const res = await apiClient.get("/products", {
    params: q ? { q } : undefined,
  });
  return ProductListResponseSchema.parse(res.data);
}

export async function fetchProduct(id: Product["id"]): Promise<Product> {
  const res = await apiClient.get(`/products/${id}`);
  return ProductResponseSchema.parse(res.data).data;
}

export async function postProduct(input: ProductCreateInput): Promise<ProductResponse> {
  // Validamos antes de enviar para fallar rápido en el cliente
  const res = await apiClient.post("/products", ProductCreateInputSchema.parse(input));
  return ProductResponseSchema.parse(res.data);
}

export async function postBulkProducts(input: ProductBulkInput): Promise<ProductBulkResponse> {
  const validated = ProductBulkInputSchema.parse(input);
  const res = await apiClient.post("/products/bulk", validated);
  return ProductBulkResponseSchema.parse(res.data);
}

export async function patchProduct(
  id: Product["id"],
  input: ProductUpdateFormValues,
): Promise<ProductResponse> {
  const res = await apiClient.patch(`/products/${id}`, input);
  return ProductResponseSchema.parse(res.data);
}

export async function deleteProduct(id: Product["id"], password: string): Promise<void> {
  // Validamos el body antes de enviar; axios DELETE requiere { data } para el body
  const body = ProductDeleteInputSchema.parse({ password });
  await apiClient.delete(`/products/${id}`, { data: body });
}
