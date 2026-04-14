import { z } from "zod";

// ─── Entity ───────────────────────────────────────────────────────────────────

export const ProductSchema = z.object({
  id:          z.string().uuid(),
  name:        z.string().min(1),
  description: z.string().optional(),
  sku:         z.string().min(1),
  price:       z.number().positive(),
  categoryId:  z.string().uuid().optional(),
  // Arrays de URLs de imágenes del producto (portada primero)
  images:      z.array(z.string()).default([]),
  // Etiquetas de búsqueda/filtrado (ej: "fiesta", "casual", "verano")
  tags:        z.array(z.string()).default([]),
  createdAt:   z.string().datetime(),
  updatedAt:   z.string().datetime(),
});

export type Product = z.infer<typeof ProductSchema>;

// ─── API Wrappers ─────────────────────────────────────────────────────────────

export const ProductResponseSchema = z.object({
  data: ProductSchema,
});

export type ProductResponse = z.infer<typeof ProductResponseSchema>;

export const ProductListResponseSchema = z.object({
  data: z.array(ProductSchema),
});

export type ProductListResponse = z.infer<typeof ProductListResponseSchema>;

// ─── Create Input ─────────────────────────────────────────────────────────────
// Shape que el cliente envía en POST /products.
// El backend asigna id, createdAt y updatedAt.

export const ProductCreateInputSchema = ProductSchema.omit({
  id:        true,
  createdAt: true,
  updatedAt: true,
});

export type ProductCreateInput = z.infer<typeof ProductCreateInputSchema>;
