import type { NextFunction, Request, Response } from "express";
import type { ProductBulkInput, ProductCreateInput, ProductDeleteInput, ProductUpdateInput } from "@kwinna/contracts";
import { ProductQuerySchema } from "@kwinna/contracts";
import {
  bulkCreateProducts,
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProductData,
} from "../services/product.service";

export async function listProducts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = ProductQuerySchema.safeParse(req.query);
    const query  = parsed.success ? parsed.data : {};
    const products = await getAllProducts(query);
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

export async function patchProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id    = req.params["id"] ?? "";
    const input = req.body as ProductUpdateInput;
    const product = await updateProductData(id, input);
    res.json({ data: product });
  } catch (err) {
    const status =
      err instanceof Error && "statusCode" in err
        ? (err as Error & { statusCode: number }).statusCode
        : 500;
    res.status(status);
    next(err);
  }
}

export async function deleteProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id          = req.params["id"] ?? "";
    const { password } = req.body as ProductDeleteInput;
    const requesterId  = req.user!.sub;

    await deleteProduct(id, requesterId, password);
    res.json({ data: { deleted: true } });
  } catch (err) {
    const status =
      err instanceof Error && "statusCode" in err
        ? (err as Error & { statusCode: number }).statusCode
        : 500;
    res.status(status);
    next(err);
  }
}

export async function bulkPostProducts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = req.body as ProductBulkInput;
    const result = await bulkCreateProducts(input);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}
