import { Router } from "express";
import { getMovements, getStock, listStock, stockIn } from "../controllers/stock.controller";
import { authGuard } from "../middlewares/auth-guard";
import { requireRole } from "../middlewares/require-role";
import { validate } from "../middlewares/validate";
import { StockMovementSchema } from "@kwinna/contracts";

const router = Router();

const StockInBodySchema = StockMovementSchema.pick({
  productId: true,
  quantity:  true,
  size:      true,
  reason:    true,
});

// GET /stock — público (product detail page necesita stock en tiempo real)
router.get("/",            listStock);
router.get("/:productId",  getStock);

// GET /stock/movements — ingresos de mercadería por rango de fecha (admin/operator)
// IMPORTANTE: debe ir antes de /:productId para que "/movements" no sea tratado como UUID
router.get(
  "/movements",
  authGuard,
  requireRole(["admin", "operator"]),
  getMovements,
);

// POST /stock/in — solo admin/operator
router.post(
  "/in",
  authGuard,
  requireRole(["admin", "operator"]),
  validate(StockInBodySchema),
  stockIn,
);

export default router;
