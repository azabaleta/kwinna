import type { NextFunction, Request, Response } from "express";
import type { User } from "@kwinna/contracts";

/**
 * Requiere que req.user.role sea uno de los roles permitidos.
 * Debe usarse DESPUÉS de authGuard (que garantiza req.user está presente).
 */
export function requireRole(allowed: Array<User["role"]>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowed.includes(req.user.role as User["role"])) {
      res.status(403).json({
        error: "Acceso denegado",
        code:  403,
      });
      return;
    }
    next();
  };
}
