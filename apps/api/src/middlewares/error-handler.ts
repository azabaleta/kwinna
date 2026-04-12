import type { NextFunction, Request, Response } from "express";
import { logError } from "./logger";

/**
 * Global error handler — debe ser el último middleware registrado en Express.
 * Captura cualquier error lanzado con next(err) en controllers o services.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // next requerido por Express para reconocer la firma de 4 argumentos
  _next: NextFunction
): void {
  logError(err, req);

  const status = res.statusCode >= 400 ? res.statusCode : 500;

  res.status(status).json({
    error: err.message ?? "Internal server error",
    code: status,
  });
}
