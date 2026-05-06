import { Router } from "express";
import { authGuard, requireRole } from "../middlewares";
import { getCreditNoteByCode } from "../controllers/credit-notes.controller";

const router = Router();

router.get("/:code", authGuard, requireRole(["admin", "operator"]), getCreditNoteByCode);

export default router;
