import { desc, eq } from "drizzle-orm";
import { db } from "../index";
import { planificacionSemanasTable } from "../schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SemanaRow {
  id:           number;
  semana:       number;
  semanaStr:    string;
  periodo:      string | null;
  jsonData:     unknown;
  creadoEn:     string;
  actualizadoEn:string;
}

export interface SemanaListItem {
  semana:   number;
  semanaStr:string;
  periodo:  string | null;
  creadoEn: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listSemanas(): Promise<SemanaListItem[]> {
  const rows = await db
    .select({
      semana:   planificacionSemanasTable.semana,
      semanaStr:planificacionSemanasTable.semanaStr,
      periodo:  planificacionSemanasTable.periodo,
      creadoEn: planificacionSemanasTable.creadoEn,
    })
    .from(planificacionSemanasTable)
    .orderBy(desc(planificacionSemanasTable.semana));

  return rows.map((r) => ({
    ...r,
    creadoEn: r.creadoEn.toISOString(),
  }));
}

export async function findSemana(semana: number): Promise<SemanaRow | null> {
  const [row] = await db
    .select()
    .from(planificacionSemanasTable)
    .where(eq(planificacionSemanasTable.semana, semana))
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    creadoEn:      row.creadoEn.toISOString(),
    actualizadoEn: row.actualizadoEn.toISOString(),
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function upsertSemana(
  semana:    number,
  semanaStr: string,
  periodo:   string | null,
  jsonData:  unknown,
): Promise<SemanaRow> {
  const [row] = await db
    .insert(planificacionSemanasTable)
    .values({
      semana,
      semanaStr,
      periodo,
      jsonData,
      actualizadoEn: new Date(),
    })
    .onConflictDoUpdate({
      target: planificacionSemanasTable.semana,
      set: {
        semanaStr,
        periodo,
        jsonData,
        actualizadoEn: new Date(),
      },
    })
    .returning();

  return {
    ...row!,
    creadoEn:      row!.creadoEn.toISOString(),
    actualizadoEn: row!.actualizadoEn.toISOString(),
  };
}
