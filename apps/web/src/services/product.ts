import {
  ProductListResponseSchema,
  ProductResponseSchema,
  type Product,
  type ProductListResponse,
} from "@kwinna/contracts";
import apiClient from "@/lib/axios";

export async function fetchProducts(): Promise<ProductListResponse> {
  const res = await apiClient.get("/products");
  return ProductListResponseSchema.parse(res.data);
}

export async function fetchProduct(id: Product["id"]): Promise<Product> {
  const res = await apiClient.get(`/products/${id}`);
  return ProductResponseSchema.parse(res.data).data;
}
