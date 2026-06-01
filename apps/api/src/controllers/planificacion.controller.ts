import type { NextFunction, Request, Response } from "express";
import { renderFichasHTML } from "../lib/render-fichas";
import {
  addComentario,
  deleteComentario,
  findSemana,
  getInteraccionSemana,
  listSemanas,
  setEstado,
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

// ─── GET /planificacion/semana/:n/interaccion ─────────────────────────────────

export async function getInteraccion(
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
    res.json(await getInteraccionSemana(n));
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /planificacion/semana/:n/ficha/:id/realizada ───────────────────────

export async function patchRealizada(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const n       = Number(req.params["n"]);
    const piezaId = req.params["id"];
    const { realizada } = req.body as { realizada?: boolean };

    if (!Number.isInteger(n) || n <= 0 || !piezaId) {
      res.status(400).json({ error: "Parámetros inválidos" });
      return;
    }
    if (typeof realizada !== "boolean") {
      res.status(400).json({ error: "El campo 'realizada' debe ser boolean" });
      return;
    }

    const row = await setEstado(n, piezaId, realizada, req.user!.sub, req.user!.name ?? "");
    res.json(row);
  } catch (err) {
    next(err);
  }
}

// ─── POST /planificacion/semana/:n/ficha/:id/comentario ───────────────────────

export async function postComentario(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const n       = Number(req.params["n"]);
    const piezaId = req.params["id"];
    const { texto } = req.body as { texto?: string };

    if (!Number.isInteger(n) || n <= 0 || !piezaId) {
      res.status(400).json({ error: "Parámetros inválidos" });
      return;
    }
    if (!texto?.trim()) {
      res.status(400).json({ error: "El comentario no puede estar vacío" });
      return;
    }

    const row = await addComentario(n, piezaId, req.user!.sub, req.user!.name ?? "", texto.trim());
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /planificacion/comentario/:id ─────────────────────────────────────

export async function removeComentario(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const deleted = await deleteComentario(id, req.user!.sub);
    if (!deleted) {
      res.status(404).json({ error: "Comentario no encontrado o sin permiso para eliminarlo" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
