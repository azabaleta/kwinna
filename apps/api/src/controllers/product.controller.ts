import type { NextFunction, Request, Response } from "express";
import { getAllProducts, getProductById } from "../services/product.service";

export function listProducts(_req: Request, res: Response): void {
  res.json({ data: getAllProducts() });
}

export function getProduct(req: Request, res: Response, next: NextFunction): void {
  const product = getProductById(req.params["id"] ?? "");

  if (!product) {
    res.status(404).json({ error: "Product not found", code: 404 });
    return;
  }

  res.json({ data: product });
}
