import { Router } from "express";
import { getDraft, putDraft, deleteDraft } from "../controllers/social-form.controller";
import { authGuard, requireRole } from "../middlewares";

const router = Router();

router.get(  "/", authGuard, requireRole(["admin", "operator"]), getDraft);
router.put(  "/", authGuard, requireRole(["admin", "operator"]), putDraft);
router.delete("/", authGuard, requireRole(["admin", "operator"]), deleteDraft);

export default router;
