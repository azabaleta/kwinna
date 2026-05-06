import { Router } from "express";
import { PosCustomerCreateInputSchema } from "@kwinna/contracts";
import { getCustomerSearch, postPosCustomer } from "../controllers/pos-customers.controller";
import { authGuard, requireRole, validate } from "../middlewares";

const router = Router();

// GET /pos-customers/search?q= — busca clientes web + POS (admin/operator)
router.get(
  "/search",
  authGuard,
  requireRole(["admin", "operator"]),
  getCustomerSearch,
);

// POST /pos-customers — registra nuevo cliente POS (admin/operator)
router.post(
  "/",
  authGuard,
  requireRole(["admin", "operator"]),
  validate(PosCustomerCreateInputSchema),
  postPosCustomer,
);

export default router;
