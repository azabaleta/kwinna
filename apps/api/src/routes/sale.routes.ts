import { Router } from "express";
import rateLimit from "express-rate-limit";
import { SaleOrderInputSchema } from "@kwinna/contracts";
import { cancelSale, getSales, getWebOrders, patchSaleStatus, postCheckout, postSale, postWebhook, patchSaleDismiss } from "../controllers/sale.controller";
import { authGuard, optionalAuth, requireRole, validate } from "../middlewares";

// 10 checkouts por IP por hora — previene reserva masiva de stock con ventas pending
const checkoutLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: "Demasiados intentos de compra. Intentá de nuevo en una hora.", code: 429 },
});

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
  checkoutLimiter,
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

// GET /sales/web-orders — pedidos web (completed|assembled) para el POS
// IMPORTANTE: antes de /:id para que "web-orders" no matchee como UUID
router.get(
  "/web-orders",
  authGuard,
  requireRole(["admin", "operator"]),
  getWebOrders
);

// PATCH /sales/:id/status — actualiza status (ej: assembled desde POS)
router.patch(
  "/:id/status",
  authGuard,
  requireRole(["admin", "operator"]),
  patchSaleStatus
);

// PUT /sales/:id/cancel — cancela una venta pending y restaura stock
// IMPORTANTE: después de "/webhook" para que "/webhook" no matchee como :id
router.put(
  "/:id/cancel",
  authGuard,
  requireRole(["admin", "operator"]),
  cancelSale
);

// PATCH /sales/:id/dismiss — desestima una venta para excluirla de las métricas
router.patch(
  "/:id/dismiss",
  authGuard,
  requireRole(["admin", "operator"]),
  patchSaleDismiss
);

export default router;
