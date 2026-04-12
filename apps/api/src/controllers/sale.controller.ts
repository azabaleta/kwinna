import type { NextFunction, Request, Response } from "express";
import type { CreateSaleInput } from "../services/sale.service";
import { createSale } from "../services/sale.service";

export function postSale(req: Request, res: Response, next: NextFunction): void {
  try {
    const input = req.body as CreateSaleInput;
    const sale = createSale(input);
    res.status(201).json({ data: sale });
  } catch (err) {
    const typed = err as Error & { statusCode?: number };
    if (typed.statusCode) res.status(typed.statusCode);
    next(err);
  }
}
