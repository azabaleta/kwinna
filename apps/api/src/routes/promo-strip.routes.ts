import { Router } from "express";
import { PromoStripUpdateInputSchema } from "@kwinna/contracts";
import { getPromoStripHandler, putPromoStripHandler } from "../controllers/promo-strip.controller";
import { authGuard, requireRole, validate } from "../middlewares";

const router = Router();

// GET /promo-strip — público: la tienda renderiza la barra promocional.
router.get("/", getPromoStripHandler);

// PUT /promo-strip — admin: activar/desactivar y editar el contenido.
router.put(
  "/",
  authGuard,
  requireRole(["admin"]),
  validate(PromoStripUpdateInputSchema),
  putPromoStripHandler,
);

export default router;
