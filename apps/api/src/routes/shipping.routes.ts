import { Router } from "express";
import { ShippingZoneCreateInputSchema, ShippingZoneUpdateInputSchema } from "@kwinna/contracts";
import { getShippingZones, postShippingZone, patchShippingZoneById, deleteShippingZoneById } from "../controllers/shipping.controller";
import { authGuard, requireRole, validate } from "../middlewares";

const router = Router();

// GET /shipping/zones — público: checkout usa este endpoint para el preview
router.get("/zones", getShippingZones);

// POST /shipping/zones — admin: crear zona
router.post(
  "/zones",
  authGuard,
  requireRole(["admin"]),
  validate(ShippingZoneCreateInputSchema),
  postShippingZone
);

// PATCH /shipping/zones/:id — admin: editar nombre o costo
router.patch(
  "/zones/:id",
  authGuard,
  requireRole(["admin"]),
  validate(ShippingZoneUpdateInputSchema),
  patchShippingZoneById
);

// DELETE /shipping/zones/:id — admin: eliminar zona
router.delete(
  "/zones/:id",
  authGuard,
  requireRole(["admin"]),
  deleteShippingZoneById
);

export default router;
