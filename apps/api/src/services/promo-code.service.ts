import type { PromoCode, PromoCodeCreateInput, PromoCodeUpdateInput, PromoCodeValidateResponse } from "@kwinna/contracts";
import {
  findAllPromoCodes,
  findPromoCodeById,
  findPromoCodeByCode,
  insertPromoCode,
  updatePromoCode,
  deletePromoCodeById,
} from "../db/repositories/promo-code.repository";
import { promotionalCodesTable } from "../db/schema";

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

export async function listPromoCodes(): Promise<PromoCode[]> {
  return findAllPromoCodes();
}

export async function createPromoCode(input: PromoCodeCreateInput): Promise<PromoCode> {
  const existing = await findPromoCodeByCode(input.code);
  if (existing) {
    throw Object.assign(new Error("Ya existe un código con ese nombre"), { statusCode: 409 });
  }

  return insertPromoCode({
    code:        input.code.toUpperCase(),
    description: input.description ?? null,

    transferDiscountType:  input.transferDiscountType  ?? null,
    transferDiscountValue: input.transferDiscountValue !== undefined ? String(input.transferDiscountValue) : null,

    cardDiscountType:  input.cardDiscountType  ?? null,
    cardDiscountValue: input.cardDiscountValue !== undefined ? String(input.cardDiscountValue) : null,

    isActive:   input.isActive ?? true,
    validFrom:  input.validFrom  ? new Date(input.validFrom)  : null,
    validUntil: input.validUntil ? new Date(input.validUntil) : null,
    maxUses:    input.maxUses ?? null,
  });
}

export async function patchPromoCode(id: string, input: PromoCodeUpdateInput): Promise<PromoCode> {
  const existing = await findPromoCodeById(id);
  if (!existing) {
    throw Object.assign(new Error("Código promocional no encontrado"), { statusCode: 404 });
  }

  if (input.code && input.code.toUpperCase() !== existing.code) {
    const conflict = await findPromoCodeByCode(input.code);
    if (conflict) {
      throw Object.assign(new Error("Ya existe un código con ese nombre"), { statusCode: 409 });
    }
  }

  const patch: Partial<typeof promotionalCodesTable.$inferInsert> = {};

  if (input.code        !== undefined) patch.code        = input.code.toUpperCase();
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.isActive    !== undefined) patch.isActive    = input.isActive;
  if (input.maxUses     !== undefined) patch.maxUses     = input.maxUses ?? null;
  if (input.validFrom   !== undefined) patch.validFrom   = input.validFrom  ? new Date(input.validFrom)  : null;
  if (input.validUntil  !== undefined) patch.validUntil  = input.validUntil ? new Date(input.validUntil) : null;

  if (input.transferDiscountType  !== undefined) patch.transferDiscountType  = input.transferDiscountType  ?? null;
  if (input.transferDiscountValue !== undefined) patch.transferDiscountValue = input.transferDiscountValue !== undefined ? String(input.transferDiscountValue) : null;
  if (input.cardDiscountType      !== undefined) patch.cardDiscountType      = input.cardDiscountType      ?? null;
  if (input.cardDiscountValue     !== undefined) patch.cardDiscountValue     = input.cardDiscountValue     !== undefined ? String(input.cardDiscountValue)     : null;

  const updated = await updatePromoCode(id, patch);
  if (!updated) throw Object.assign(new Error("Código promocional no encontrado"), { statusCode: 404 });
  return updated;
}

export async function removePromoCode(id: string): Promise<void> {
  const deleted = await deletePromoCodeById(id);
  if (!deleted) {
    throw Object.assign(new Error("Código promocional no encontrado"), { statusCode: 404 });
  }
}

// ─── Public validation ────────────────────────────────────────────────────────
// Usado por el checkout web para mostrar preview del descuento.
// NO incrementa usedCount — eso ocurre dentro de la transacción de venta.

export async function validatePromoCode(
  code: string,
  paymentMethod: "mercadopago" | "transfer"
): Promise<PromoCodeValidateResponse> {
  const promo = await findPromoCodeByCode(code);

  if (!promo) {
    return { valid: false, errorMessage: "Código inválido" };
  }
  if (!promo.isActive) {
    return { valid: false, errorMessage: "Código inactivo" };
  }

  const now = new Date();
  if (promo.validFrom  && new Date(promo.validFrom)  > now) {
    return { valid: false, errorMessage: "Código aún no vigente" };
  }
  if (promo.validUntil && new Date(promo.validUntil) < now) {
    return { valid: false, errorMessage: "Código vencido" };
  }
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
    return { valid: false, errorMessage: "Código agotado" };
  }

  const isTransfer = paymentMethod === "transfer";
  const discountType  = isTransfer ? promo.transferDiscountType  : promo.cardDiscountType;
  const discountValue = isTransfer ? promo.transferDiscountValue : promo.cardDiscountValue;

  if (!discountType || discountValue === null || discountValue === undefined) {
    return {
      valid:        false,
      errorMessage: `Este código no aplica para ${isTransfer ? "transferencia" : "tarjeta"}`,
    };
  }

  const label =
    discountType === "percentage"
      ? `${discountValue}% de descuento adicional`
      : `$${discountValue.toLocaleString("es-AR")} de descuento`;

  return {
    valid:         true,
    discountType,
    discountValue,
    discountLabel: label,
  };
}

// ─── Internal: resolve promo for a sale transaction ──────────────────────────
// Returns the promo row if valid and applicable, throws otherwise.
// Called from sale.service.ts inside the DB transaction.

export async function resolvePromoForSale(
  code: string,
  paymentMethod: string
): Promise<{ id: string; discountType: "percentage" | "fixed"; discountValue: number } | null> {
  if (!code) return null;

  const validPm = paymentMethod === "transfer" || paymentMethod === "mercadopago";
  if (!validPm) return null;

  const result = await validatePromoCode(code, paymentMethod as "mercadopago" | "transfer");
  if (!result.valid) {
    throw Object.assign(new Error(result.errorMessage ?? "Código promocional inválido"), { statusCode: 422 });
  }

  const promo = await findPromoCodeByCode(code);
  return {
    id:            promo!.id,
    discountType:  result.discountType!,
    discountValue: result.discountValue!,
  };
}
