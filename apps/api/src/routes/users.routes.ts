import { Router } from "express";
import { getCustomers } from "../controllers/users.controller";
import { authGuard } from "../middlewares/auth-guard";
import { requireRole } from "../middlewares/require-role";

const router = Router();

// GET /users/customers — lista clientes con métricas de compras
// Requiere JWT válido con rol admin u operator.
router.get(
  "/customers",
  authGuard,
  requireRole(["admin", "operator"]),
  getCustomers,
);

export default router;
