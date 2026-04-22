import { z } from "zod";

// ─── Reason enum ──────────────────────────────────────────────────────────────

export const ReturnReasonSchema = z.enum([
  "quality",
  "detail",
  "color",
  "size",
  "not_as_expected",
]);

export type ReturnReason = z.infer<typeof ReturnReasonSchema>;

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  quality:         "Calidad",
  detail:          "Detalle",
  color:           "Color",
  size:            "Talle",
  not_as_expected: "No es lo que esperaba",
};

/**
 * Whether a return of this reason is likely resalable.
 * Used to set the smart default for the "restock" toggle in the form.
 */
export const RETURN_REASON_RESALABLE: Record<ReturnReason, boolean> = {
  quality:         false, // damaged goods
  detail:          false, // likely damaged
  color:           true,  // wrong color, item is fine
  size:            true,  // wrong size, item is fine
  not_as_expected: true,  // item is fine, just didn't match expectations
};

// ─── Return entity ────────────────────────────────────────────────────────────

export const ReturnSchema = z.object({
  id:        z.string().uuid(),
  saleId:    z.string().uuid().optional(),
  productId: z.string().uuid(),
  size:      z.string().optional(),
  quantity:  z.number().int().positive(),
  reason:    ReturnReasonSchema,
  notes:     z.string().optional(),
  restocked: z.boolean(),
  unitPrice: z.number().nonnegative(),
  createdAt: z.string().datetime(),
});

export type Return = z.infer<typeof ReturnSchema>;

// ─── Input schema (POST /returns) ─────────────────────────────────────────────
// `restock` decides whether the backend calls addStock after inserting.
// `unitPrice` is NOT accepted from the client — the backend fetches it from
// the products table to prevent price manipulation.

export const ReturnCreateInputSchema = z.object({
  saleId:    z.string().uuid().optional(),
  productId: z.string().uuid(),
  size:      z.string().optional(),
  quantity:  z.number().int().min(1),
  reason:    ReturnReasonSchema,
  notes:     z.string().max(500).optional(),
  restock:   z.boolean().default(false),
});

export type ReturnCreateInput = z.infer<typeof ReturnCreateInputSchema>;

// ─── API wrappers ─────────────────────────────────────────────────────────────

export const ReturnResponseSchema = z.object({ data: ReturnSchema });
export type ReturnResponse = z.infer<typeof ReturnResponseSchema>;

export const ReturnListResponseSchema = z.object({ data: z.array(ReturnSchema) });
export type ReturnListResponse = z.infer<typeof ReturnListResponseSchema>;

export const ReturnsSummarySchema = z.object({
  data: z.object({
    total:         z.number(),
    lostQuantity:  z.number(),
    lostValue:     z.number(),
    byReason: z.object({
      quality:         z.number(),
      detail:          z.number(),
      color:           z.number(),
      size:            z.number(),
      not_as_expected: z.number(),
    }),
  }),
});
export type ReturnsSummaryResponse = z.infer<typeof ReturnsSummarySchema>;
