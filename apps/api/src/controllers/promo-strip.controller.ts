import type { NextFunction, Request, Response } from "express";
import { PromoStripUpdateInputSchema } from "@kwinna/contracts";
import { getPromoStrip, updatePromoStrip } from "../db/repositories";

// ─── GET /promo-strip ─────────────────────────────────────────────────────────
// Público: la tienda lo consume para renderizar la barra promocional.

export async function getPromoStripHandler(
  _req: Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await getPromoStrip();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /promo-strip ─────────────────────────────────────────────────────────
// Admin: activar/desactivar y editar mensaje + código.

export async function putPromoStripHandler(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = PromoStripUpdateInputSchema.parse(req.body);
    const data  = await updatePromoStrip(input);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
