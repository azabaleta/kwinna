import type { NextFunction, Request, Response } from "express";
import {
  listCategories,
  createCategory,
  renameCategory,
  listItemTypes,
  createItemType,
  renameItemType,
  listQualities,
  createQuality,
  renameQuality,
  listVariants,
  createVariant,
  renameVariant,
} from "../services/glossary.service";

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ data: await listCategories() });
  } catch (err) {
    next(err);
  }
}

export async function postCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const row = await createCategory(req.body as { code: string; name: string });
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
}

export async function patchCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params["id"]);
    const row = await renameCategory(id, (req.body as { name: string }).name);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

// ─── Item types ───────────────────────────────────────────────────────────────

export async function getItemTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categoryId = Number(req.query["categoryId"]);
    res.json({ data: await listItemTypes(categoryId) });
  } catch (err) {
    next(err);
  }
}

export async function postItemType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const row = await createItemType(req.body as { categoryId: number; code: string; name: string });
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
}

export async function patchItemType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params["id"]);
    const row = await renameItemType(id, (req.body as { name: string }).name);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

// ─── Qualities ────────────────────────────────────────────────────────────────

export async function getQualities(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const itemTypeId = Number(req.query["itemTypeId"]);
    res.json({ data: await listQualities(itemTypeId) });
  } catch (err) {
    next(err);
  }
}

export async function postQuality(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const row = await createQuality(req.body as { itemTypeId: number; code: string; name: string });
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
}

export async function patchQuality(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params["id"]);
    const row = await renameQuality(id, (req.body as { name: string }).name);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}

// ─── Variants ─────────────────────────────────────────────────────────────────

export async function getVariants(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const qualityId = Number(req.query["qualityId"]);
    res.json({ data: await listVariants(qualityId) });
  } catch (err) {
    next(err);
  }
}

export async function postVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const row = await createVariant(req.body as { qualityId: number; code: string; name: string });
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
}

export async function patchVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params["id"]);
    const row = await renameVariant(id, (req.body as { name: string }).name);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
}
