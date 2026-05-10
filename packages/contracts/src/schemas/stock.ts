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
  // size es undefined para productos sin variante de talle (igual que StockSchema)
  size:      z.string().optional(),
  type:      z.enum(["in", "out", "adjustment"]),
  quantity:  z.number().int().positive(),
  reason:    z.string().optional(),
  createdAt: z.string().datetime(),
});

export type StockMovement = z.infer<typeof StockMovementSchema>;

export const StockOutBodySchema = z.object({
  productId: z.string().uuid(),
  quantity:  z.number().int().positive(),
  size:      z.string().optional(),
  reason:    z.string().min(1, "El motivo es obligatorio para registrar la merma/ajuste"),
});

export type StockOutInput = z.infer<typeof StockOutBodySchema>;

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

// ─── Stock Balance (Inventory Count) ──────────────────────────────────────────

export const StockBalanceStatusSchema = z.enum(["in_progress", "completed", "cancelled"]);

export const StockBalanceItemSchema = z.object({
  id:               z.string().uuid(),
  balanceId:        z.string().uuid(),
  productId:        z.string().uuid(),
  size:             z.string().optional(),
  expectedQuantity: z.number().int().nonnegative().nullable(),
  countedQuantity:  z.number().int().nonnegative(),
  unitPrice:        z.number().nullable(),
});

export type StockBalanceItem = z.infer<typeof StockBalanceItemSchema>;

export const StockBalanceSchema = z.object({
  id:                 z.string().uuid(),
  status:             StockBalanceStatusSchema,
  notes:              z.string().nullable(),
  createdBy:          z.string().uuid(),
  totalLosses:        z.number().nullable(),
  totalDiscrepancies: z.number().nullable(),
  accuracyPercentage: z.number().nullable(),
  createdAt:          z.string().datetime(),
  updatedAt:          z.string().datetime(),
  completedAt:        z.string().datetime().nullable(),
  items:              z.array(StockBalanceItemSchema).optional(),
});

export type StockBalance = z.infer<typeof StockBalanceSchema>;

export const StockBalanceCreateSchema = z.object({
  notes: z.string().optional(),
});

export const StockBalanceUpdateItemSchema = z.object({
  productId: z.string().uuid(),
  size:      z.string().optional(),
  quantity:  z.number().int().nonnegative(),
});

export const StockBalanceUpdateSchema = z.object({
  items: z.array(StockBalanceUpdateItemSchema),
});

export const StockBalanceResponseSchema = z.object({
  data: StockBalanceSchema,
});

export type StockBalanceResponse = z.infer<typeof StockBalanceResponseSchema>;

export const StockBalanceListResponseSchema = z.object({
  data: z.array(StockBalanceSchema),
});

export type StockBalanceListResponse = z.infer<typeof StockBalanceListResponseSchema>;
