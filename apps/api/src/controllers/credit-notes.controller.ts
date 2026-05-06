import type { NextFunction, Request, Response } from "express";
import { findCreditNoteByCode } from "../db/repositories/credit-note.repository";

// ─── GET /credit-notes/:code ──────────────────────────────────────────────────
// Lookup de nota de crédito por código (ej: NC-A3X7K).
// Usado desde el POS para validar una nota antes de usarla en una venta.

export async function getCreditNoteByCode(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { code } = req.params as { code: string };
    const creditNote = await findCreditNoteByCode(code);

    if (!creditNote) {
      res.status(404).json({ error: "Nota de crédito no encontrada" });
      return;
    }

    res.json({ data: creditNote });
  } catch (err) {
    next(err);
  }
}
