import {
  ProductCreateInputSchema,
  ProductListResponseSchema,
  ProductResponseSchema,
  type Product,
  type ProductCreateInput,
  type ProductListResponse,
  type ProductResponse,
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

export async function postProduct(input: ProductCreateInput): Promise<ProductResponse> {
  // Validamos antes de enviar para fallar rápido en el cliente
  const res = await apiClient.post("/products", ProductCreateInputSchema.parse(input));
  return ProductResponseSchema.parse(res.data);
}
