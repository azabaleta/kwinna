import { Router } from "express";
import rateLimit from "express-rate-limit";
import { SaleOrderInputSchema } from "@kwinna/contracts";
import { cancelSale, getSales, getWebOrders, patchSaleStatus, postCheckout, postSale, postWebhook, patchSaleDismiss, postReconcile, postApproveTransfer, getSale } from "../controllers/sale.controller";
import { authGuard, optionalAuth, requireRole, validate } from "../middlewares";

// 10 checkouts por hora — previene reserva masiva de stock con ventas pending.
// Prioriza el user ID del JWT sobre la IP para no penalizar redes compartidas
// (oficinas, 4G). La IP es el fallback para usuarios no autenticados.
// NOTA: optionalAuth debe correr ANTES de este limiter para que req.user esté disponible.
const checkoutLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => {
    const user = (req as { user?: { sub: string } }).user;
    return user?.sub ?? req.ip ?? "unknown";
  },
  message:         { error: "Demasiados intentos de compra. Intentá de nuevo en una hora.", code: 429 },
});

const router = Router();

// POST /sales — POS / venta directa (completed inmediato, sin MP)
// Requiere autenticación: solo operadores y admins pueden crear ventas POS.
// Esto previene que un cliente anónimo drene stock o spoofe un vendorId.
router.post(
  "/",
  authGuard,
  requireRole(["admin", "operator"]),
  validate(SaleOrderInputSchema),
  postSale
);

// POST /sales/checkout — Checkout Pro con MercadoPago
// Crea la venta como pending + genera Preference MP → devuelve { sale, initPoint }
// optionalAuth va antes del limiter: el keyGenerator necesita req.user para limitar por ID.
router.post(
  "/checkout",
  optionalAuth,
  checkoutLimiter,
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

// GET /sales/:id — detalle público de venta (para success page)
router.get("/:id", getSale);

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

// POST /sales/:id/reconcile — reconcilia el pago en MP
router.post(
  "/:id/reconcile",
  authGuard,
  requireRole(["admin", "operator"]),
  postReconcile
);

// POST /sales/:id/approve-transfer — aprueba una transferencia bancaria manualmente
router.post(
  "/:id/approve-transfer",
  authGuard,
  requireRole(["admin", "operator"]),
  postApproveTransfer
);

export default router;
