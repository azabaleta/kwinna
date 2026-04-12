import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

/**
 * The Shield — valida req.body contra un schema Zod antes de llegar al controller.
 * Si falla, corta la cadena con 400 y los errores formateados.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: "Validation error",
        code: 400,
        issues: result.error.flatten().fieldErrors,
      });
      return;
    }

    // Reemplaza req.body por el valor parseado (limpio y tipado por Zod)
    req.body = result.data;
    next();
  };
}
