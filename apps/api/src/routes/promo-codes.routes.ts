import { Router } from "express";
import { PromoCodeCreateInputSchema, PromoCodeUpdateInputSchema, PromoCodeValidateInputSchema } from "@kwinna/contracts";
import { getPromoCodes, postPromoCode, patchPromoCodeById, deletePromoCodeById, postValidatePromoCode } from "../controllers/promo-code.controller";
import { authGuard, requireRole, validate } from "../middlewares";

const router = Router();

// POST /promo-codes/validate — público: verifica un código antes del checkout
// IMPORTANTE: debe ir antes de /:id para que "validate" no matchee como UUID
router.post(
  "/validate",
  validate(PromoCodeValidateInputSchema),
  postValidatePromoCode
);

// GET /promo-codes — admin: listar todos
router.get(
  "/",
  authGuard,
  requireRole(["admin"]),
  getPromoCodes
);

// POST /promo-codes — admin: crear
router.post(
  "/",
  authGuard,
  requireRole(["admin"]),
  validate(PromoCodeCreateInputSchema),
  postPromoCode
);

// PATCH /promo-codes/:id — admin: editar / toggle activo
router.patch(
  "/:id",
  authGuard,
  requireRole(["admin"]),
  validate(PromoCodeUpdateInputSchema),
  patchPromoCodeById
);

// DELETE /promo-codes/:id — admin: eliminar
router.delete(
  "/:id",
  authGuard,
  requireRole(["admin"]),
  deletePromoCodeById
);

export default router;
