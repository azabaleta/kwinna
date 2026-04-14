import { Router } from "express";
import { SaleOrderInputSchema } from "@kwinna/contracts";
import { cancelSale, getSales, postCheckout, postSale, postWebhook } from "../controllers/sale.controller";
import { authGuard, optionalAuth, requireRole, validate } from "../middlewares";

const router = Router();

// POST /sales — POS / venta directa (completed inmediato, sin MP)
router.post(
  "/",
  optionalAuth,
  validate(SaleOrderInputSchema),
  postSale
);

// POST /sales/checkout — Checkout Pro con MercadoPago
// Crea la venta como pending + genera Preference MP → devuelve { sale, initPoint }
router.post(
  "/checkout",
  optionalAuth,
  validate(SaleOrderInputSchema),
  postCheckout
);

// POST /sales/webhook — receptor de notificaciones de pago de MP
// PÚBLICO — MP no envía auth token. La seguridad es la firma HMAC-SHA256.
// IMPORTANTE: debe estar antes de rutas con :id para que "/webhook" no matchee como UUID.
router.post("/webhook", postWebhook);

// GET /sales — lista con PII, solo admin/operator
router.get(
  "/",
  authGuard,
  requireRole(["admin", "operator"]),
  getSales
);

// PUT /sales/:id/cancel — cancela una venta pending y restaura stock
// IMPORTANTE: después de "/webhook" para que "/webhook" no matchee como :id
router.put(
  "/:id/cancel",
  authGuard,
  requireRole(["admin", "operator"]),
  cancelSale
);

export default router;
