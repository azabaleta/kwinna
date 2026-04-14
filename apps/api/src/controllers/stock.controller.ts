import type { NextFunction, Request, Response } from "express";
import { addStock, getAllStock, getStockByProductId, type StockInInput } from "../services/stock.service";

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
