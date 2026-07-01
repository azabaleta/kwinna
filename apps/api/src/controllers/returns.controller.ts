import { z } from "zod";
import type { NextFunction, Request, Response } from "express";
import { ReturnBatchCreateInputSchema, ReturnCreateInputSchema } from "@kwinna/contracts";
import { findAllReturns, findReturnsByDateRange } from "../db/repositories";
import { createReturn, createReturnBatch } from "../services/returns.service";
import type { ReturnReason } from "@kwinna/contracts";

const RETURN_WINDOW_DAYS = 30;

// ─── Query schema para /summary ───────────────────────────────────────────────

const SummaryQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to:   z.string().datetime({ offset: true }).optional(),
});

// ─── GET /returns ─────────────────────────────────────────────────────────────

export async function getReturns(
  _req: Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await findAllReturns();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// ─── POST /returns ────────────────────────────────────────────────────────────

export async function postReturn(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = ReturnCreateInputSchema.parse(req.body);
    const { returnData, creditNote } = await createReturn(input);
    res.status(201).json({ data: returnData, creditNote });
  } catch (err) {
    next(err);
  }
}

// ─── POST /returns/batch ──────────────────────────────────────────────────────
// Varias prendas de una misma transacción → una única nota de crédito.

export async function postReturnBatch(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = ReturnBatchCreateInputSchema.parse(req.body);
    const { returns, creditNote } = await createReturnBatch(input);
    res.status(201).json({ data: returns, creditNote });
  } catch (err) {
    next(err);
  }
}

// ─── GET /returns/summary ─────────────────────────────────────────────────────

export async function getReturnsSummary(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = SummaryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Parámetros de fecha inválidos", details: parsed.error.flatten() });
      return;
    }

    const { from, to } = parsed.data;
    const fromDate = from ? new Date(from) : new Date(0);
    const toDate   = to   ? new Date(to)   : new Date();

    const returns = await findReturnsByDateRange(fromDate, toDate);

    const sum = (reason: ReturnReason) =>
      returns
        .filter((r) => r.reason === reason)
        .reduce((acc, r) => acc + r.quantity, 0);

    const lost = returns.filter((r) => !r.restocked);

    res.json({
      data: {
        total:        returns.reduce((acc, r) => acc + r.quantity, 0),
        lostQuantity: lost.reduce((acc, r) => acc + r.quantity, 0),
        lostValue:    lost.reduce((acc, r) => acc + r.quantity * r.unitPrice, 0),
        byReason: {
          quality:         sum("quality"),
          detail:          sum("detail"),
          color:           sum("color"),
          size:            sum("size"),
          not_as_expected: sum("not_as_expected"),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
