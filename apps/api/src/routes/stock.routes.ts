import { Router } from "express";
import { getStock, listStock, stockIn } from "../controllers/stock.controller";
import { validate } from "../middlewares/validate";
import { StockMovementSchema } from "@kwinna/contracts";

const router = Router();

const StockInBodySchema = StockMovementSchema.pick({
  productId: true,
  quantity: true,
  reason: true,
});

router.get("/", listStock);
router.get("/:productId", getStock);
router.post("/in", validate(StockInBodySchema), stockIn);

export default router;
