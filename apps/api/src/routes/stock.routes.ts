import { Router } from "express";
import { getMovements, getAllMovements, getStock, listStock, stockIn, stockOut } from "../controllers/stock.controller";
import { authGuard } from "../middlewares/auth-guard";
import { requireRole } from "../middlewares/require-role";
import { validate } from "../middlewares/validate";
import { StockMovementSchema, StockOutBodySchema } from "@kwinna/contracts";

const router = Router();

const StockInBodySchema = StockMovementSchema.pick({
  productId: true,
  quantity:  true,
  size:      true,
  reason:    true,
});

// GET /stock — público (product detail page necesita stock en tiempo real)
router.get("/", listStock);

// GET /stock/movements — ingresos de mercadería por rango de fecha (admin/operator)
// Debe ir antes de /:productId para que "movements" no sea capturado como UUID.
router.get(
  "/movements",
  authGuard,
  requireRole(["admin", "operator"]),
  getMovements,
);

router.get(
  "/movements/all",
  authGuard,
  requireRole(["admin", "operator"]),
  getAllMovements,
);

// POST /stock/in — solo admin/operator
router.post(
  "/in",
  authGuard,
  requireRole(["admin", "operator"]),
  validate(StockInBodySchema),
  stockIn,
);

// POST /stock/out — solo admin/operator
router.post(
  "/out",
  authGuard,
  requireRole(["admin", "operator"]),
  validate(StockOutBodySchema),
  stockOut,
);

router.get("/:productId", getStock);

export default router;
