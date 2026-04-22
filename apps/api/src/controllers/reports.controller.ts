import type { NextFunction, Request, Response } from "express";
import { GenerateSnapshotInputSchema } from "@kwinna/contracts";
import {
  generateSnapshot,
  findAllSnapshots,
  findSnapshotById,
  deleteSnapshot,
} from "../services/reports.service";
import { uploadCsvToDrive } from "../services/drive.service";
import { buildSnapshotCsv, snapshotFilename } from "../lib/snapshot-csv";

// ─── GET /reports/snapshots ───────────────────────────────────────────────────

export async function getSnapshots(
  _req: Request,
  res:  Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await findAllSnapshots();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// ─── GET /reports/snapshots/:id ───────────────────────────────────────────────

export async function getSnapshot(
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const snapshot = await findSnapshotById(id);
    if (!snapshot) {
      res.status(404).json({ error: "Snapshot no encontrado" });
      return;
    }
    res.json({ data: snapshot });
  } catch (err) {
    next(err);
  }
}

// ─── POST /reports/snapshots ──────────────────────────────────────────────────
// Genera y persiste un nuevo snapshot con las métricas del período indicado.

export async function postSnapshot(
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> {
  try {
    const input  = GenerateSnapshotInputSchema.parse(req.body);
    const snapshot = await generateSnapshot(input);
    res.status(201).json({ data: snapshot });
  } catch (err) {
    next(err);
  }
}

// ─── POST /reports/snapshots/:id/export-drive ────────────────────────────────
// Genera el CSV del snapshot y lo sube a la carpeta de Google Drive configurada.
// Devuelve { fileId, webViewLink } para que el frontend muestre el link.

export async function exportSnapshotToDrive(
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as { id: string };

    const snapshot = await findSnapshotById(id);
    if (!snapshot) {
      res.status(404).json({ error: "Snapshot no encontrado" });
      return;
    }

    const csv      = buildSnapshotCsv(snapshot);
    const filename = snapshotFilename(snapshot);
    const result   = await uploadCsvToDrive(filename, csv);

    res.json({ data: result });
  } catch (err) {
    const typed = err as Error & { statusCode?: number };
    if (typed.statusCode) res.status(typed.statusCode);
    next(err);
  }
}

// ─── DELETE /reports/snapshots/:id ───────────────────────────────────────────

export async function removeSnapshot(
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const deleted = await deleteSnapshot(id);
    if (!deleted) {
      res.status(404).json({ error: "Snapshot no encontrado" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
