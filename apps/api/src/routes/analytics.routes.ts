import { Router } from "express";
import { postEvent, getSummary } from "../controllers/analytics.controller";
import { authGuard, optionalAuth, requireRole } from "../middlewares";

const router = Router();

// POST /analytics/event — público, fire-and-forget
router.post("/event", optionalAuth, postEvent);

// GET /analytics/summary — solo admin/operator
router.get("/summary", authGuard, requireRole(["admin", "operator"]), getSummary);

export default router;
