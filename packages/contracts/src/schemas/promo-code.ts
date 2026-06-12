import { z } from "zod";

// ─── Discount type ────────────────────────────────────────────────────────────

export const DiscountTypeSchema = z.enum(["percentage", "fixed"]);
export type DiscountType = z.infer<typeof DiscountTypeSchema>;

// ─── PromoCode entity ─────────────────────────────────────────────────────────

export const PromoCodeSchema = z.object({
  id:          z.string().uuid(),
  code:        z.string(),
  description: z.string().nullable().optional(),

  // Transfer discount (applies when paymentMethod === "transfer")
  transferDiscountType:  DiscountTypeSchema.nullable().optional(),
  transferDiscountValue: z.number().nullable().optional(),

  // Card discount (applies when paymentMethod === "mercadopago")
  cardDiscountType:  DiscountTypeSchema.nullable().optional(),
  cardDiscountValue: z.number().nullable().optional(),

  isActive:   z.boolean(),
  validFrom:  z.string().datetime().nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  maxUses:    z.number().int().nullable().optional(),
  usedCount:  z.number().int(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PromoCode = z.infer<typeof PromoCodeSchema>;

// ─── Create / Update ──────────────────────────────────────────────────────────

const PromoCodeBaseShape = z.object({
  code:        z.string().min(3, "Mínimo 3 caracteres").max(50).regex(/^[A-Z0-9_-]+$/, "Solo mayúsculas, números, guión y guión bajo"),
  description: z.string().max(200).optional(),

  transferDiscountType:  DiscountTypeSchema.optional(),
  transferDiscountValue: z.number().positive().optional(),

  cardDiscountType:  DiscountTypeSchema.optional(),
  cardDiscountValue: z.number().positive().optional(),

  isActive:   z.boolean().default(true),
  validFrom:  z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  maxUses:    z.number().int().positive().optional(),
});

export const PromoCodeCreateInputSchema = PromoCodeBaseShape
  .superRefine((data, ctx) => {
    const hasTransfer = data.transferDiscountType && data.transferDiscountValue;
    const hasCard     = data.cardDiscountType     && data.cardDiscountValue;

    if (!hasTransfer && !hasCard) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: "Debe configurar al menos un descuento (transferencia o tarjeta)",
        path:    ["transferDiscountType"],
      });
    }

    if (data.transferDiscountType && !data.transferDiscountValue) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El valor del descuento es requerido", path: ["transferDiscountValue"] });
    }
    if (data.transferDiscountValue && !data.transferDiscountType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El tipo de descuento es requerido", path: ["transferDiscountType"] });
    }
    if (data.cardDiscountType && !data.cardDiscountValue) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El valor del descuento es requerido", path: ["cardDiscountValue"] });
    }
    if (data.cardDiscountValue && !data.cardDiscountType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El tipo de descuento es requerido", path: ["cardDiscountType"] });
    }
    if (data.transferDiscountType === "percentage" && (data.transferDiscountValue ?? 0) > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El porcentaje no puede superar 100", path: ["transferDiscountValue"] });
    }
    if (data.cardDiscountType === "percentage" && (data.cardDiscountValue ?? 0) > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El porcentaje no puede superar 100", path: ["cardDiscountValue"] });
    }
  });

export type PromoCodeCreateInput = z.infer<typeof PromoCodeCreateInputSchema>;

export const PromoCodeUpdateInputSchema = PromoCodeBaseShape.partial();
export type PromoCodeUpdateInput = z.infer<typeof PromoCodeUpdateInputSchema>;

// ─── Validate endpoint ────────────────────────────────────────────────────────

export const PromoCodeValidateInputSchema = z.object({
  code:          z.string().min(1),
  paymentMethod: z.enum(["mercadopago", "transfer"]),
});
export type PromoCodeValidateInput = z.infer<typeof PromoCodeValidateInputSchema>;

export const PromoCodeValidateResponseSchema = z.object({
  valid:          z.boolean(),
  discountType:   DiscountTypeSchema.optional(),
  discountValue:  z.number().optional(),
  discountLabel:  z.string().optional(),
  errorMessage:   z.string().optional(),
});
export type PromoCodeValidateResponse = z.infer<typeof PromoCodeValidateResponseSchema>;

// ─── API wrappers ─────────────────────────────────────────────────────────────

export const PromoCodeListResponseSchema = z.object({
  data: z.array(PromoCodeSchema),
});
export type PromoCodeListResponse = z.infer<typeof PromoCodeListResponseSchema>;

export const PromoCodeResponseSchema = z.object({
  data: PromoCodeSchema,
});
export type PromoCodeResponse = z.infer<typeof PromoCodeResponseSchema>;

