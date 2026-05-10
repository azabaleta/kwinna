import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import type { OperatorCreateInput, OperatorUpdateInput } from "@kwinna/contracts";
import {
  findAllCustomers,
  findAllOperators,
  createOperator,
  updateOperator,
  setOperatorActive,
  setCustomerActive,
} from "../db/repositories/user.repository";

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

// ─── PATCH /users/customers/:id/ban ───────────────────────────────────────────
export async function banCustomer(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await setCustomerActive(id, false);
    res.status(204).send();
  } catch (err) { next(err); }
}

// ─── PATCH /users/customers/:id/unban ─────────────────────────────────────────
export async function unbanCustomer(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await setCustomerActive(id, true);
    res.status(204).send();
  } catch (err) { next(err); }
}

// ─── GET /users/operators ─────────────────────────────────────────────────────
export async function getOperators(
  _req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const data = await findAllOperators();
    res.json({ data });
  } catch (err) { next(err); }
}

// ─── POST /users/operators ────────────────────────────────────────────────────
export async function postOperator(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const { name, email, password } = req.body as OperatorCreateInput;
    const passwordHash = await bcrypt.hash(password, 12);
    const operator = await createOperator({ name, email, passwordHash });
    res.status(201).json({ data: operator });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg?.code === "23505") {
      res.status(409).json({ error: "Ya existe un usuario con ese email." });
      return;
    }
    next(err);
  }
}

// ─── PATCH /users/operators/:id ───────────────────────────────────────────────
export async function patchOperator(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { name, password } = req.body as OperatorUpdateInput;
    const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
    const operator = await updateOperator(id, { name, passwordHash });
    if (!operator) { res.status(404).json({ error: "Operador no encontrado." }); return; }
    res.json({ data: operator });
  } catch (err) { next(err); }
}

// ─── DELETE /users/operators/:id (soft-delete) ────────────────────────────────
export async function deleteOperator(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await setOperatorActive(id, false);
    res.status(204).send();
  } catch (err) { next(err); }
}

// ─── PATCH /users/operators/:id/reactivate ────────────────────────────────────
export async function reactivateOperator(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await setOperatorActive(id, true);
    res.status(204).send();
  } catch (err) { next(err); }
}
