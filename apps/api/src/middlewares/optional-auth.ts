import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../services/auth.service";

/**
 * Extrae el usuario del JWT si el header Authorization está presente y es válido.
 * No rechaza la request si no hay token — permite checkout anónimo.
 * Los controllers leen req.user para vincular la venta a un usuario registrado.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];

  if (authHeader?.startsWith("Bearer ")) {
    try {
      req.user = verifyToken(authHeader.slice(7));
    } catch {
      // Token inválido → se ignora, se procede como anónimo
    }
  }

  next();
}
