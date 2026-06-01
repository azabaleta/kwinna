import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../index";
import {
  planificacionComentariosTable,
  planificacionEstadosTable,
  planificacionSemanasTable,
} from "../schema";

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

// ─── Types — interacción ──────────────────────────────────────────────────────

export interface EstadoRow {
  piezaId:              string;
  realizada:            boolean;
  actualizadoEn:        string;
  actualizadoPorNombre: string | null;
}

export interface ComentarioRow {
  id:       number;
  piezaId:  string;
  userId:   string;
  userName: string;
  texto:    string;
  creadoEn: string;
}

export interface InteraccionSemana {
  estados:     Record<string, EstadoRow>;
  comentarios: Record<string, ComentarioRow[]>;
}

// ─── Queries — interacción ────────────────────────────────────────────────────

export async function getInteraccionSemana(semana: number): Promise<InteraccionSemana> {
  const [estadoRows, comentarioRows] = await Promise.all([
    db
      .select()
      .from(planificacionEstadosTable)
      .where(eq(planificacionEstadosTable.semana, semana)),
    db
      .select()
      .from(planificacionComentariosTable)
      .where(eq(planificacionComentariosTable.semana, semana))
      .orderBy(asc(planificacionComentariosTable.creadoEn)),
  ]);

  const estados: Record<string, EstadoRow> = {};
  for (const r of estadoRows) {
    estados[r.piezaId] = {
      piezaId:              r.piezaId,
      realizada:            r.realizada,
      actualizadoEn:        r.actualizadoEn.toISOString(),
      actualizadoPorNombre: r.actualizadoPorNombre,
    };
  }

  const comentarios: Record<string, ComentarioRow[]> = {};
  for (const r of comentarioRows) {
    if (!comentarios[r.piezaId]) comentarios[r.piezaId] = [];
    comentarios[r.piezaId]!.push({
      id:       r.id,
      piezaId:  r.piezaId,
      userId:   r.userId,
      userName: r.userName,
      texto:    r.texto,
      creadoEn: r.creadoEn.toISOString(),
    });
  }

  return { estados, comentarios };
}

// ─── Mutations — interacción ──────────────────────────────────────────────────

export async function setEstado(
  semana:   number,
  piezaId:  string,
  realizada:boolean,
  userId:   string,
  userName: string,
): Promise<EstadoRow> {
  const [row] = await db
    .insert(planificacionEstadosTable)
    .values({ semana, piezaId, realizada, actualizadoPorId: userId, actualizadoPorNombre: userName, actualizadoEn: new Date() })
    .onConflictDoUpdate({
      target: [planificacionEstadosTable.semana, planificacionEstadosTable.piezaId],
      set:    { realizada, actualizadoPorId: userId, actualizadoPorNombre: userName, actualizadoEn: new Date() },
    })
    .returning();

  return {
    piezaId:              row!.piezaId,
    realizada:            row!.realizada,
    actualizadoEn:        row!.actualizadoEn.toISOString(),
    actualizadoPorNombre: row!.actualizadoPorNombre,
  };
}

export async function addComentario(
  semana:   number,
  piezaId:  string,
  userId:   string,
  userName: string,
  texto:    string,
): Promise<ComentarioRow> {
  const [row] = await db
    .insert(planificacionComentariosTable)
    .values({ semana, piezaId, userId, userName, texto })
    .returning();

  return {
    id:       row!.id,
    piezaId:  row!.piezaId,
    userId:   row!.userId,
    userName: row!.userName,
    texto:    row!.texto,
    creadoEn: row!.creadoEn.toISOString(),
  };
}

export async function deleteComentario(id: number, userId: string): Promise<boolean> {
  const result = await db
    .delete(planificacionComentariosTable)
    .where(
      and(
        eq(planificacionComentariosTable.id, id),
        eq(planificacionComentariosTable.userId, userId),
      )
    )
    .returning({ id: planificacionComentariosTable.id });

  return result.length > 0;
}
