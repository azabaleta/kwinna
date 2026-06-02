import { Router } from "express";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { authGuard, requireRole } from "../middlewares";
import {
  getInteraccion,
  getSemana,
  getSemanaHtml,
  getSemanas,
  patchRealizada,
  postComentario,
  removeComentario,
  uploadSemana,
} from "../controllers/planificacion.controller";

// ─── API Key middleware ───────────────────────────────────────────────────────

function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["x-api-key"];
  if (!key || key !== process.env["PIPELINE_API_KEY"]) {
    res.status(401).json({ error: "API key inválida" });
    return;
  }
  next();
}

const jwtOp = [authGuard, requireRole(["admin", "operator"])] as const;

const router = Router();

router.post(  "/upload",                          apiKeyAuth, express.json({ limit: "10mb" }), uploadSemana);
router.get(   "/semanas",                         ...jwtOp,    getSemanas);
router.get(   "/semana/:n",                       ...jwtOp,    getSemana);
router.get(   "/semana/:n/html",                  ...jwtOp,    getSemanaHtml);
router.get(   "/semana/:n/interaccion",           ...jwtOp,    getInteraccion);
router.patch( "/semana/:n/ficha/:id/realizada",   ...jwtOp,    patchRealizada);
router.post(  "/semana/:n/ficha/:id/comentario",  ...jwtOp,    postComentario);
router.delete("/comentario/:id",                  ...jwtOp,    removeComentario);

export default router;
