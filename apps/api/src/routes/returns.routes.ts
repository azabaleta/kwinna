import { Router } from "express";
import { getReturns, getReturnsSummary, postReturn, postReturnBatch } from "../controllers/returns.controller";
import { authGuard, requireRole } from "../middlewares";

const router = Router();

// Todos los endpoints requieren admin u operator.

router.get("/",        authGuard, requireRole(["admin", "operator"]), getReturns);
router.get("/summary", authGuard, requireRole(["admin", "operator"]), getReturnsSummary);
router.post("/batch",  authGuard, requireRole(["admin", "operator"]), postReturnBatch);
router.post("/",       authGuard, requireRole(["admin", "operator"]), postReturn);

export default router;
