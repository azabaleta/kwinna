import type { NextFunction, Request, Response } from "express";
import { SocialFormDataSchema } from "@kwinna/contracts";
import {
  findDraftByUserId,
  upsertDraft,
  deleteDraftByUserId,
} from "../db/repositories/social-form.repository";

// ─── GET /social-form ─────────────────────────────────────────────────────────

export async function getDraft(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const draft = await findDraftByUserId(req.user!.sub);
    res.json({
      data:      draft?.data      ?? null,
      updatedAt: draft?.updatedAt ?? null,
    });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /social-form ─────────────────────────────────────────────────────────

export async function putDraft(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = SocialFormDataSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Datos del formulario inválidos", details: parsed.error.flatten() });
      return;
    }

    const draft = await upsertDraft(req.user!.sub, parsed.data);
    res.json({ data: draft.data, updatedAt: draft.updatedAt });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /social-form ──────────────────────────────────────────────────────

export async function deleteDraft(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteDraftByUserId(req.user!.sub);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
