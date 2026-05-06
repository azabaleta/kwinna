import { eq, ilike, or } from "drizzle-orm";
import type { PosCustomer, PosCustomerCreateInput } from "@kwinna/contracts";
import { db } from "../index";
import { posCustomersTable } from "../schema";

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapRow(row: typeof posCustomersTable.$inferSelect): PosCustomer {
  return {
    id:        row.id,
    name:      row.name,
    dni:       row.dni,
    phone:     row.phone,
    email:     row.email    ?? undefined,
    address:   row.address  ?? undefined,
    city:      row.city     ?? undefined,
    province:  row.province ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findPosCustomerByDni(dni: string): Promise<PosCustomer | undefined> {
  const rows = await db
    .select()
    .from(posCustomersTable)
    .where(eq(posCustomersTable.dni, dni.trim()));
  return rows[0] ? mapRow(rows[0]) : undefined;
}

export async function searchPosCustomers(q: string): Promise<PosCustomer[]> {
  const rows = await db
    .select()
    .from(posCustomersTable)
    .where(
      or(
        ilike(posCustomersTable.name, `%${q}%`),
        eq(posCustomersTable.dni, q.trim()),
      )
    )
    .limit(10);
  return rows.map(mapRow);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createPosCustomer(input: PosCustomerCreateInput): Promise<PosCustomer> {
  // Drizzle 0.45.x bug: passing `undefined` as an explicit object key causes the column
  // to appear in the INSERT column list without a corresponding value, breaking the query.
  // Only include optional fields when they actually have a value.
  const [row] = await db
    .insert(posCustomersTable)
    .values({
      name:  input.name.trim(),
      dni:   input.dni.trim(),
      phone: input.phone.trim(),
      ...(input.email    !== undefined && { email:    input.email }),
      ...(input.address  !== undefined && { address:  input.address }),
      ...(input.city     !== undefined && { city:     input.city }),
      ...(input.province !== undefined && { province: input.province }),
    })
    .returning();
  return mapRow(row!);
}
