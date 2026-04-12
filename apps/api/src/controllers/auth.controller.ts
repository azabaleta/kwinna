import type { NextFunction, Request, Response } from "express";
import type { LoginInput } from "../services/auth.service";
import { login } from "../services/auth.service";

export function postLogin(req: Request, res: Response, next: NextFunction): void {
  try {
    const input = req.body as LoginInput;
    const result = login(input);
    res.json(result);
  } catch (err) {
    const typed = err as Error & { statusCode?: number };
    if (typed.statusCode) res.status(typed.statusCode);
    next(err);
  }
}
