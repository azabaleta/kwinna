import { eq } from "drizzle-orm";
import type { ShippingZone } from "@kwinna/contracts";
import { db } from "../index";
import { shippingZonesTable } from "../schema";

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapRow(row: typeof shippingZonesTable.$inferSelect): ShippingZone {
  return {
    id:          row.id,
    city:        row.city,
    displayName: row.displayName,
    cost:        Number(row.cost),
    updatedAt:   row.updatedAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findAllShippingZones(): Promise<ShippingZone[]> {
  const rows = await db
    .select()
    .from(shippingZonesTable)
    .orderBy(shippingZonesTable.displayName);
  return rows.map(mapRow);
}

export async function findShippingZoneByCity(city: string): Promise<ShippingZone | null> {
  const [row] = await db
    .select()
    .from(shippingZonesTable)
    .where(eq(shippingZonesTable.city, city))
    .limit(1);
  return row ? mapRow(row) : null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function insertShippingZone(
  city: string,
  displayName: string,
  cost: number
): Promise<ShippingZone> {
  const [row] = await db
    .insert(shippingZonesTable)
    .values({ city, displayName, cost: String(cost) })
    .returning();
  return mapRow(row!);
}

export async function updateShippingZone(
  id: string,
  patch: { city?: string; displayName?: string; cost?: number }
): Promise<ShippingZone | null> {
  const set: Partial<typeof shippingZonesTable.$inferInsert> = { updatedAt: new Date() };
  if (patch.city        !== undefined) set.city        = patch.city;
  if (patch.displayName !== undefined) set.displayName = patch.displayName;
  if (patch.cost        !== undefined) set.cost        = String(patch.cost);

  const [row] = await db
    .update(shippingZonesTable)
    .set(set)
    .where(eq(shippingZonesTable.id, id))
    .returning();
  return row ? mapRow(row) : null;
}

export async function deleteShippingZone(id: string): Promise<boolean> {
  const result = await db
    .delete(shippingZonesTable)
    .where(eq(shippingZonesTable.id, id))
    .returning({ id: shippingZonesTable.id });
  return result.length > 0;
}
