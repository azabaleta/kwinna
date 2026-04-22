import type { NextFunction, Request, Response } from "express";
import { addStock, getAllStock, getStockByProductId, type StockInInput } from "../services/stock.service";
import { findStockMovementsInRange } from "../db/repositories";

export async function listStock(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stock = await getAllStock();
    res.json({ data: stock });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /stock/:productId
 * Retorna TODAS las filas de stock para el producto (una por variante de talle).
 * Responde con { data: Stock[] } — mismo wrapper que /stock.
 */
export async function getStock(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const entries = await getStockByProductId(req.params["productId"] ?? "");

    if (entries.length === 0) {
      res.status(404).json({ error: "Stock entry not found", code: 404 });
      return;
    }

    res.json({ data: entries });
  } catch (err) {
    next(err);
  }
}

// ─── GET /stock/movements?from=ISO&to=ISO ─────────────────────────────────────
// Devuelve todos los ingresos ("in") de mercadería en el rango indicado.
// Usado por el dashboard para calcular el Sell-Through Rate por variante.

export async function getMovements(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const fromDate = from ? new Date(from) : new Date(0);
    const toDate   = to   ? new Date(to)   : new Date();
    const data = await findStockMovementsInRange(fromDate, toDate);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function stockIn(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as StockInInput;
    const movement = await addStock(input);
    res.status(201).json({ data: movement });
  } catch (err) {
    next(err);
  }
}
