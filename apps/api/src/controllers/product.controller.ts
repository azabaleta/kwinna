import type { NextFunction, Request, Response } from "express";
import type { ProductCreateInput } from "@kwinna/contracts";
import { createProduct, getAllProducts, getProductById } from "../services/product.service";

export async function listProducts(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const products = await getAllProducts();
    res.json({ data: products });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const product = await getProductById(req.params["id"] ?? "");

    if (!product) {
      res.status(404).json({ error: "Product not found", code: 404 });
      return;
    }

    res.json({ data: product });
  } catch (err) {
    next(err);
  }
}

export async function postProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as ProductCreateInput;
    const product = await createProduct(input);
    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
}
