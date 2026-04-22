import { z } from "zod";

// ─── Entity ───────────────────────────────────────────────────────────────────

// Temporada interna — solo visible en el panel de administración.
// null = sin temporada asignada (ej: accesorios).
export const ProductSeasonSchema = z.enum(["invierno", "verano", "media_estacion"]);
export type ProductSeason = z.infer<typeof ProductSeasonSchema>;

export const SEASON_LABELS: Record<ProductSeason, string> = {
  invierno:       "Invierno",
  verano:         "Verano",
  media_estacion: "Media estación",
};

export const ProductSchema = z.object({
  id:          z.string().uuid(),
  name:        z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  sku:         z.string().min(1).max(100),
  price:       z.number().positive().max(99_999_999),
  categoryId:  z.string().uuid().optional(),
  // Arrays de URLs de imágenes �� .url() previene strings arbitrarios/internos
  images:      z.array(z.string().url().max(500)).max(10).default([]),
  // Etiquetas públicas de filtrado (ej: "Calzas Oxford", "Bikers")
  tags:        z.array(z.string().min(1).max(50)).max(20).default([]),
  // Etiqueta interna de temporada — solo en panel admin, no se muestra en tienda
  season:      ProductSeasonSchema.optional(),
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

// ─── Update Input ────────────────────────────────────────────────────────────
// PATCH /products/:id — todos los campos son opcionales (partial update).
// El backend actualiza solo los campos que vengan presentes en el payload.

export const ProductUpdateInputSchema = ProductCreateInputSchema.partial();

export type ProductUpdateInput = z.infer<typeof ProductUpdateInputSchema>;

// ─── Delete Input ─────────────────────────────────────────────────────────────
// DELETE /products/:id — el admin debe re-ingresar su contraseña para confirmar.

export const ProductDeleteInputSchema = z.object({
  password: z.string().min(1, "La contraseña es requerida"),
});

export type ProductDeleteInput = z.infer<typeof ProductDeleteInputSchema>;

// ─── Query / Search ───────────────────────────────────────────────────────────
// Parámetros opcionales de búsqueda para GET /products.
// El backend usa `q` para filtrar por nombre o descripción (ilike).

export const ProductQuerySchema = z.object({
  q: z.string().min(1).max(100).optional(),
});

export type ProductQuery = z.infer<typeof ProductQuerySchema>;

// ─── Bulk Import ──────────────────────────────────────────────────────────────
// POST /products/bulk — un producto + sus variantes de stock en un único item.
// Un mismo SKU del Excel puede aparecer N veces (una por talle): el importer
// las agrupa antes de enviar; el backend hace la transacción atómica.

export const BulkStockEntrySchema = z.object({
  size:     z.string().optional(),
  quantity: z.number().int().positive(),
});

export const ProductBulkItemSchema = z.object({
  product: ProductCreateInputSchema,
  stock:   z.array(BulkStockEntrySchema).min(1),
});

export const ProductBulkInputSchema = z.object({
  items: z.array(ProductBulkItemSchema).min(1).max(500),
});

export const ProductBulkResponseSchema = z.object({
  data: z.object({
    created:  z.number().int().nonnegative(),
    skipped:  z.number().int().nonnegative(),
    products: z.array(ProductSchema),
  }),
});

export type BulkStockEntry       = z.infer<typeof BulkStockEntrySchema>;
export type ProductBulkItem      = z.infer<typeof ProductBulkItemSchema>;
export type ProductBulkInput     = z.infer<typeof ProductBulkInputSchema>;
export type ProductBulkResponse  = z.infer<typeof ProductBulkResponseSchema>;
