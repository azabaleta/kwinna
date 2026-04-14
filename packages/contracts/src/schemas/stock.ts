import { z } from "zod";

// ─── Stock Entity ─────────────────────────────────────────────────────────────
// La llave de negocio es (productId, size).
// size === undefined → producto sin variante de talle (accesorios, etc.)
// La BD almacena '' (cadena vacía) como centinela para los productos sin talle
// y el mapper convierte '' ↔ undefined en cada dirección.

export const StockSchema = z.object({
  id:        z.string().uuid(),
  productId: z.string().uuid(),
  // Talle de la variante (S, M, L, XL, etc.). undefined = sin talle.
  size:      z.string().optional(),
  quantity:  z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type Stock = z.infer<typeof StockSchema>;

// ─── StockMovement Entity ─────────────────────────────────────────────────────

export const StockMovementSchema = z.object({
  id:        z.string().uuid(),
  productId: z.string().uuid(),
  type:      z.enum(["in", "out", "adjustment"]),
  quantity:  z.number().int().positive(),
  reason:    z.string().optional(),
  createdAt: z.string().datetime(),
});

export type StockMovement = z.infer<typeof StockMovementSchema>;

// ─── API Wrappers ─────────────────────────────────────────────────────────────

export const StockResponseSchema = z.object({
  data: StockSchema,
});

export type StockResponse = z.infer<typeof StockResponseSchema>;

export const StockListResponseSchema = z.object({
  data: z.array(StockSchema),
});

export type StockListResponse = z.infer<typeof StockListResponseSchema>;

export const StockMovementResponseSchema = z.object({
  data: StockMovementSchema,
});

export type StockMovementResponse = z.infer<typeof StockMovementResponseSchema>;

export const StockMovementListResponseSchema = z.object({
  data: z.array(StockMovementSchema),
});

export type StockMovementListResponse = z.infer<typeof StockMovementListResponseSchema>;
