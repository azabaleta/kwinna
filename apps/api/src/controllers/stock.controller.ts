import type { NextFunction, Request, Response } from "express";
import type { StockInInput } from "../services/stock.service";
import { addStock, getAllStock, getStockByProductId } from "../services/stock.service";

export function listStock(_req: Request, res: Response): void {
  res.json({ data: getAllStock() });
}

export function getStock(req: Request, res: Response): void {
  const entry = getStockByProductId(req.params["productId"] ?? "");

  if (!entry) {
    res.status(404).json({ error: "Stock entry not found", code: 404 });
    return;
  }

  res.json({ data: entry });
}

export function stockIn(req: Request, res: Response, next: NextFunction): void {
  try {
    const input = req.body as StockInInput;
    const movement = addStock(input);
    res.status(201).json({ data: movement });
  } catch (err) {
    next(err);
  }
}
