import { Router } from "express";
import { getStock, listStock, stockIn } from "../controllers/stock.controller";
import { requireRole } from "../middlewares/require-role";
import { validate } from "../middlewares/validate";
import { StockMovementSchema } from "@kwinna/contracts";

const router = Router();

const StockInBodySchema = StockMovementSchema.pick({
  productId: true,
  quantity:  true,
  reason:    true,
});

// GET /stock — público (product detail page necesita stock en tiempo real)
router.get("/",            listStock);
router.get("/:productId",  getStock);

// POST /stock/in — solo admin/operator (authGuard ya aplicado en main.ts)
router.post(
  "/in",
  requireRole(["admin", "operator"]),
  validate(StockInBodySchema),
  stockIn,
);

export default router;
