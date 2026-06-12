import type { NextFunction, Request, Response } from "express";
import type { ShippingZoneCreateInput, ShippingZoneUpdateInput } from "@kwinna/contracts";
import { listShippingZones, createShippingZone, patchShippingZone, removeShippingZone } from "../services/shipping.service";

// ─── GET /shipping/zones — público ────────────────────────────────────────────

export async function getShippingZones(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await listShippingZones();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// ─── POST /shipping/zones — admin ─────────────────────────────────────────────

export async function postShippingZone(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as ShippingZoneCreateInput;
    const data  = await createShippingZone(input);
    res.status(201).json({ data });
  } catch (err) {
    const typed = err as Error & { statusCode?: number };
    if (typed.statusCode) res.status(typed.statusCode);
    next(err);
  }
}

// ─── PATCH /shipping/zones/:id — admin ────────────────────────────────────────

export async function patchShippingZoneById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const input  = req.body as ShippingZoneUpdateInput;
    const data   = await patchShippingZone(id, input);
    res.json({ data });
  } catch (err) {
    const typed = err as Error & { statusCode?: number };
    if (typed.statusCode) res.status(typed.statusCode);
    next(err);
  }
}

// ─── DELETE /shipping/zones/:id — admin ───────────────────────────────────────

export async function deleteShippingZoneById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await removeShippingZone(id);
    res.status(204).send();
  } catch (err) {
    const typed = err as Error & { statusCode?: number };
    if (typed.statusCode) res.status(typed.statusCode);
    next(err);
  }
}
