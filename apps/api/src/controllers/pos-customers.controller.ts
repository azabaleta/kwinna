import type { NextFunction, Request, Response } from "express";
import type { PosCustomerCreateInput } from "@kwinna/contracts";
import { createPosCustomer, searchPosCustomers } from "../db/repositories/pos-customer.repository";
import { searchWebCustomers } from "../db/repositories/user.repository";

// ─── GET /pos-customers/search?q= ────────────────────────────────────────────
// Busca clientes web (users con role=customer) y clientes POS por nombre / DNI.
// Requiere al menos 2 caracteres para evitar búsquedas vacías.

export async function getCustomerSearch(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const q = ((req.query["q"] as string) ?? "").trim();

    if (q.length < 2) {
      res.json({ data: [] });
      return;
    }

    const [webCustomers, posCustomers] = await Promise.all([
      searchWebCustomers(q),
      searchPosCustomers(q),
    ]);

    const data = [
      ...webCustomers.map((c) => ({
        source: "web" as const,
        id:     c.id,
        name:   c.name,
        email:  c.email,
      })),
      ...posCustomers.map((c) => ({
        source:   "pos" as const,
        id:       c.id,
        name:     c.name,
        phone:    c.phone,
        dni:      c.dni,
        email:    c.email,
        address:  c.address,
        city:     c.city,
        province: c.province,
      })),
    ];

    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// ─── POST /pos-customers ──────────────────────────────────────────────────────
// Crea un nuevo cliente POS. DNI es único — devuelve 409 si ya existe.

export async function postPosCustomer(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as PosCustomerCreateInput;
    const customer = await createPosCustomer(input);
    res.status(201).json({ data: customer });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg?.code === "23505") {
      res.status(409).json({ error: "Ya existe un cliente registrado con ese DNI." });
      return;
    }
    next(err);
  }
}
