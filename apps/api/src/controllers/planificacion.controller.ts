import type { NextFunction, Request, Response } from "express";
import { renderFichasHTML } from "../lib/render-fichas";
import {
  findSemana,
  listSemanas,
  upsertSemana,
} from "../db/repositories/planificacion.repository";

// ─── POST /planificacion/upload ───────────────────────────────────────────────

export async function uploadSemana(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { semana, semana_str, periodo, piezas } = req.body as {
      semana?:     number;
      semana_str?: string;
      periodo?:    string;
      piezas?:     unknown[];
    };

    if (!semana || !piezas) {
      res.status(400).json({ error: "Faltan campos: semana, piezas" });
      return;
    }

    const payload = { semana, semana_str, periodo, piezas };
    await upsertSemana(
      semana,
      semana_str ?? String(semana),
      periodo    ?? null,
      payload,
    );

    res.json({ ok: true, semana, piezas: piezas.length });
  } catch (err) {
    next(err);
  }
}

// ─── GET /planificacion/semanas ───────────────────────────────────────────────

export async function getSemanas(
  _req: Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rows = await listSemanas();
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /planificacion/semana/:n ─────────────────────────────────────────────

export async function getSemana(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const n = Number(req.params["n"]);
    if (!Number.isInteger(n) || n <= 0) {
      res.status(400).json({ error: "Número de semana inválido" });
      return;
    }

    const row = await findSemana(n);
    if (!row) {
      res.status(404).json({ error: "Semana no encontrada" });
      return;
    }

    res.json(row.jsonData);
  } catch (err) {
    next(err);
  }
}

// ─── GET /planificacion/semana/:n/html ────────────────────────────────────────

export async function getSemanaHtml(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const n = Number(req.params["n"]);
    if (!Number.isInteger(n) || n <= 0) {
      res.status(400).json({ error: "Número de semana inválido" });
      return;
    }

    const row = await findSemana(n);
    if (!row) {
      res.status(404).json({ error: "Semana no encontrada" });
      return;
    }

    const html = renderFichasHTML(row.jsonData as Parameters<typeof renderFichasHTML>[0]);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    next(err);
  }
}
