import type { NextFunction, Request, Response } from "express";
import { findAllCustomers } from "../db/repositories/user.repository";

// ─── GET /users/customers ─────────────────────────────────────────────────────
// Lista todos los clientes registrados con métricas de compras.
// Solo accesible para admin/operator.

export async function getCustomers(
  _req: Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await findAllCustomers();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
