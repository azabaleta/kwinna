import { Router } from "express";
import {
  getCustomers,
  getOperators,
  postOperator,
  patchOperator,
  deleteOperator,
  reactivateOperator,
  banCustomer,
  unbanCustomer,
} from "../controllers/users.controller";
import { authGuard } from "../middlewares/auth-guard";
import { requireRole } from "../middlewares/require-role";

const router = Router();

// GET /users/customers — lista clientes con métricas (admin/operator)
router.get("/customers", authGuard, requireRole(["admin", "operator"]), getCustomers);
router.patch("/customers/:id/ban", authGuard, requireRole(["admin"]), banCustomer);
router.patch("/customers/:id/unban", authGuard, requireRole(["admin"]), unbanCustomer);

// ── Operadores (solo admin) ───────────────────────────────────────────────────
router.get(    "/operators",                  authGuard, requireRole(["admin"]), getOperators);
router.post(   "/operators",                  authGuard, requireRole(["admin"]), postOperator);
router.patch(  "/operators/:id",              authGuard, requireRole(["admin"]), patchOperator);
router.delete( "/operators/:id",              authGuard, requireRole(["admin"]), deleteOperator);
router.patch(  "/operators/:id/reactivate",   authGuard, requireRole(["admin"]), reactivateOperator);

export default router;
