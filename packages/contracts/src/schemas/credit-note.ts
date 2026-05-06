import { z } from "zod";

// ─── Status ───────────────────────────────────────────────────────────────────

export const CreditNoteStatusSchema = z.enum(["active", "redeemed", "void"]);
export type CreditNoteStatus = z.infer<typeof CreditNoteStatusSchema>;

// ─── CreditNote entity ────────────────────────────────────────────────────────
// Las notas de crédito se generan automáticamente al registrar una devolución.
// Tienen un código único legible (NC-XXXXXX) que se imprime en el ticket 58mm.
// Al usarse en una venta, se marcan como "redeemed" y no pueden reutilizarse.
// Si el crédito supera el total de la nueva venta, se emite una nota residual.

export const CreditNoteSchema = z.object({
  id:                 z.string().uuid(),
  code:               z.string(),           // ej: "NC-A3X7K"
  amount:             z.number().nonnegative(),
  status:             CreditNoteStatusSchema,
  customerName:       z.string().optional(),
  customerDni:        z.string().optional(),
  posCustomerId:      z.string().uuid().optional(),
  userId:             z.string().uuid().optional(),
  reason:             z.string().optional(), // ReturnReason as string to avoid circular import
  returnId:           z.string().uuid().optional(),
  originCreditNoteId: z.string().uuid().optional(), // nota original que generó este residuo
  redeemedSaleId:     z.string().uuid().optional(),
  redeemedAt:         z.string().datetime().optional(),
  createdAt:          z.string().datetime(),
});

export type CreditNote = z.infer<typeof CreditNoteSchema>;

export const CreditNoteResponseSchema = z.object({ data: CreditNoteSchema });
export type CreditNoteResponse = z.infer<typeof CreditNoteResponseSchema>;
