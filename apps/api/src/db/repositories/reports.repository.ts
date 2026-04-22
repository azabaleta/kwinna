import { desc, eq } from "drizzle-orm";
import type { MetricSnapshot, SnapshotData, SnapshotPeriod } from "@kwinna/contracts";
import { db } from "../index";
import { metricSnapshotsTable } from "../schema";

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapRow(row: typeof metricSnapshotsTable.$inferSelect): MetricSnapshot {
  return {
    id:        row.id,
    period:    row.period as SnapshotPeriod,
    label:     row.label,
    dateFrom:  row.dateFrom.toISOString(),
    dateTo:    row.dateTo.toISOString(),
    data:      row.data as SnapshotData,
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findAllSnapshots(): Promise<MetricSnapshot[]> {
  const rows = await db
    .select()
    .from(metricSnapshotsTable)
    .orderBy(desc(metricSnapshotsTable.createdAt));
  return rows.map(mapRow);
}

export async function findSnapshotById(id: string): Promise<MetricSnapshot | undefined> {
  const [row] = await db
    .select()
    .from(metricSnapshotsTable)
    .where(eq(metricSnapshotsTable.id, id));
  return row ? mapRow(row) : undefined;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function insertSnapshot(input: {
  period:   SnapshotPeriod;
  label:    string;
  dateFrom: Date;
  dateTo:   Date;
  data:     SnapshotData;
}): Promise<MetricSnapshot> {
  const [row] = await db
    .insert(metricSnapshotsTable)
    .values({
      period:   input.period,
      label:    input.label,
      dateFrom: input.dateFrom,
      dateTo:   input.dateTo,
      data:     input.data as Record<string, unknown>,
    })
    .returning();
  return mapRow(row!);
}

export async function deleteSnapshot(id: string): Promise<boolean> {
  const result = await db
    .delete(metricSnapshotsTable)
    .where(eq(metricSnapshotsTable.id, id))
    .returning({ id: metricSnapshotsTable.id });
  return result.length > 0;
}
