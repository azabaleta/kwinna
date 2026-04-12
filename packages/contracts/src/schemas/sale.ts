import { z } from "zod";

// ─── SaleItem Sub-schema ──────────────────────────────────────────────────────

export const SaleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  subtotal: z.number().positive(),
});

export type SaleItem = z.infer<typeof SaleItemSchema>;

// ─── Sale Entity ──────────────────────────────────────────────────────────────

export const SaleSchema = z.object({
  id: z.string().uuid(),
  items: z.array(SaleItemSchema),
  total: z.number().positive(),
  status: z.enum(["pending", "completed", "cancelled"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Sale = z.infer<typeof SaleSchema>;

// ─── API Wrappers ─────────────────────────────────────────────────────────────

export const SaleResponseSchema = z.object({
  data: SaleSchema,
});

export type SaleResponse = z.infer<typeof SaleResponseSchema>;

export const SaleListResponseSchema = z.object({
  data: z.array(SaleSchema),
});

export type SaleListResponse = z.infer<typeof SaleListResponseSchema>;
