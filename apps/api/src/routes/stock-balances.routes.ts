import { Router } from "express";
import { authGuard } from "../middlewares/auth-guard";
import { requireRole } from "../middlewares/require-role";
import { validate } from "../middlewares/validate";
import { StockBalanceCreateSchema, StockBalanceUpdateSchema } from "@kwinna/contracts";
import {
  createBalance,
  listBalances,
  getBalance,
  updateDraft,
  completeBalance,
  cancelBalance
} from "../controllers/stock-balances.controller";

const router = Router();

// Todas las rutas de balance requieren permisos de admin o operator
router.use(authGuard, requireRole(["admin", "operator"]));

router.get("/", listBalances);
router.post("/", validate(StockBalanceCreateSchema), createBalance);
router.get("/:id", getBalance);
router.patch("/:id", validate(StockBalanceUpdateSchema), updateDraft);
router.post("/:id/complete", validate(StockBalanceUpdateSchema), completeBalance);
router.delete("/:id", cancelBalance);

export default router;
