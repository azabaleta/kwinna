import type { NextFunction, Request, Response } from "express";
import { verifyToken, type JwtPayload } from "../services/auth.service";

// Extiende Request para que los controllers tengan acceso a req.user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authGuard(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de autorización requerido", code: 401 });
    return;
  }

  const token = authHeader.slice(7);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado", code: 401 });
  }
}
