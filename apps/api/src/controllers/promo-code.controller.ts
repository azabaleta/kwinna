import type { NextFunction, Request, Response } from "express";
import type { PromoCodeCreateInput, PromoCodeUpdateInput, PromoCodeValidateInput } from "@kwinna/contracts";
import {
  createPromoCode,
  listPromoCodes,
  patchPromoCode,
  removePromoCode,
  validatePromoCode,
} from "../services/promo-code.service";

// ─── GET /promo-codes ─────────────────────────────────────────────────────────

export async function getPromoCodes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await listPromoCodes();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// ─── POST /promo-codes ────────────────────────────────────────────────────────

export async function postPromoCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as PromoCodeCreateInput;
    const data  = await createPromoCode(input);
    res.status(201).json({ data });
  } catch (err) {
    const typed = err as Error & { statusCode?: number };
    if (typed.statusCode) res.status(typed.statusCode);
    next(err);
  }
}

// ─── PATCH /promo-codes/:id ───────────────────────────────────────────────────

export async function patchPromoCodeById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id }  = req.params as { id: string };
    const input   = req.body as PromoCodeUpdateInput;
    const data    = await patchPromoCode(id, input);
    res.json({ data });
  } catch (err) {
    const typed = err as Error & { statusCode?: number };
    if (typed.statusCode) res.status(typed.statusCode);
    next(err);
  }
}

// ─── DELETE /promo-codes/:id ──────────────────────────────────────────────────

export async function deletePromoCodeById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await removePromoCode(id);
    res.status(204).end();
  } catch (err) {
    const typed = err as Error & { statusCode?: number };
    if (typed.statusCode) res.status(typed.statusCode);
    next(err);
  }
}

// ─── POST /promo-codes/validate ───────────────────────────────────────────────
// Endpoint público — devuelve el descuento aplicable para un código + método de pago.
// No incrementa usedCount; eso ocurre en la transacción de venta.

export async function postValidatePromoCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, paymentMethod } = req.body as PromoCodeValidateInput;
    const result = await validatePromoCode(code, paymentMethod);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
