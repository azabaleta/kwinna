import { and, desc, eq, inArray } from "drizzle-orm";
import type { CustomerMetrics, User } from "@kwinna/contracts";
import { db } from "../index";
import { salesTable, usersTable } from "../schema";

// ─── Internal type ────────────────────────────────────────────────────────────
// Incluye el hash que nunca se expone fuera del módulo de auth.

export interface StoredUser extends User {
  passwordHash: string;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapRow(row: typeof usersTable.$inferSelect): StoredUser {
  return {
    id:            row.id,
    email:         row.email,
    name:          row.name,
    role:          row.role,
    emailVerified: row.emailVerified,
    passwordHash:  row.passwordHash,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findUserByEmail(
  email: string,
): Promise<StoredUser | undefined> {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));
  return rows[0] ? mapRow(rows[0]) : undefined;
}

export async function findUserById(
  id: string,
): Promise<StoredUser | undefined> {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));
  return rows[0] ? mapRow(rows[0]) : undefined;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface CreateUserInput {
  email:         string;
  name:          string;
  passwordHash:  string;
  role?:         "admin" | "operator" | "customer";
  emailVerified?: boolean;
}

export async function createUser(input: CreateUserInput): Promise<StoredUser> {
  const [row] = await db
    .insert(usersTable)
    .values({
      email:         input.email.toLowerCase(),
      name:          input.name,
      passwordHash:  input.passwordHash,
      role:          input.role ?? "customer",
      emailVerified: input.emailVerified ?? false,
      createdAt:     new Date(),
    })
    .returning();
  return mapRow(row!);
}

/**
 * Lista todos los clientes registrados con métricas de compras.
 * Dos queries simples + cálculo en memoria — evita sql templates complejos
 * que tienen comportamiento distinto entre versiones de Drizzle.
 */
export async function findAllCustomers(): Promise<CustomerMetrics[]> {
  const now          = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  // 1 — Todos los clientes registrados, sin passwordHash
  const customers = await db
    .select({
      id:            usersTable.id,
      name:          usersTable.name,
      email:         usersTable.email,
      emailVerified: usersTable.emailVerified,
      createdAt:     usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.role, "customer"))
    .orderBy(desc(usersTable.createdAt));

  if (customers.length === 0) return [];

  // 2 — Todas las ventas completadas de estos clientes en una sola query
  const customerIds = customers.map((c) => c.id);
  const sales = await db
    .select({
      userId:    salesTable.userId,
      total:     salesTable.total,
      createdAt: salesTable.createdAt,
    })
    .from(salesTable)
    .where(
      and(
        eq(salesTable.status, "completed"),
        inArray(salesTable.userId, customerIds),
      ),
    );

  // 3 — Calcular métricas en memoria (O(S) — S = total de ventas completadas)
  return customers.map((c) => {
    const own = sales.filter((s) => s.userId === c.id);

    const totalLifetime = own.reduce((sum, s) => sum + Number(s.total), 0);
    const totalSemester = own
      .filter((s) => s.createdAt >= sixMonthsAgo)
      .reduce((sum, s) => sum + Number(s.total), 0);
    const totalMonth = own
      .filter((s) => s.createdAt >= startOfMonth)
      .reduce((sum, s) => sum + Number(s.total), 0);

    return {
      id:            c.id,
      name:          c.name,
      email:         c.email,
      emailVerified: c.emailVerified,
      createdAt:     c.createdAt.toISOString(),
      totalLifetime,
      totalSemester,
      totalMonth,
    };
  });
}

export async function markEmailVerified(userId: string): Promise<void> {
  await db
    .update(usersTable)
    .set({ emailVerified: true })
    .where(eq(usersTable.id, userId));
}

export async function deleteUser(userId: string): Promise<void> {
  await db
    .delete(usersTable)
    .where(eq(usersTable.id, userId));
}

export async function updatePassword(
  userId:       string,
  passwordHash: string,
): Promise<void> {
  await db
    .update(usersTable)
    .set({ passwordHash })
    .where(eq(usersTable.id, userId));
}

export async function upsertAdminUser(
  email:        string,
  name:         string,
  passwordHash: string,
): Promise<void> {
  await db
    .insert(usersTable)
    .values({
      email:         email.toLowerCase(),
      name,
      role:          "admin",
      passwordHash,
      emailVerified: true,
      createdAt:     new Date(),
    })
    .onConflictDoUpdate({
      target: usersTable.email,
      set:    { name, passwordHash },
    });
}
