import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { authGuard, requireRole } from "../middlewares";
import {
  getSemana,
  getSemanaHtml,
  getSemanas,
  uploadSemana,
} from "../controllers/planificacion.controller";

// ─── API Key middleware ───────────────────────────────────────────────────────
// Usado exclusivamente por el pipeline externo (script Python).

function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["x-api-key"];
  if (!key || key !== process.env["PIPELINE_API_KEY"]) {
    res.status(401).json({ error: "API key inválida" });
    return;
  }
  next();
}

const router = Router();

router.post(  "/upload",          apiKeyAuth,                             uploadSemana);
router.get(   "/semanas",         authGuard, requireRole(["admin", "operator"]), getSemanas);
router.get(   "/semana/:n",       authGuard, requireRole(["admin", "operator"]), getSemana);
router.get(   "/semana/:n/html",  authGuard, requireRole(["admin", "operator"]), getSemanaHtml);

export default router;
