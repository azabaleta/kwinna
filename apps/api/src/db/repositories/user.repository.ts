import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import type { CustomerMetrics, Operator, User } from "@kwinna/contracts";
import { PAID_SALE_STATUSES } from "@kwinna/contracts";
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
    isActive:      row.isActive,
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
      isActive:      usersTable.isActive,
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
        inArray(salesTable.status, [...PAID_SALE_STATUSES]),
        inArray(salesTable.userId, customerIds),
        eq(salesTable.isDismissed, false),   // desestimadas no cuentan en los totales del cliente
      ),
    );

  // 3 — Calcular métricas en memoria (O(S) — S = total de ventas cobradas)
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
      isActive:      c.isActive,
      createdAt:     c.createdAt.toISOString(),
      totalLifetime,
      totalSemester,
      totalMonth,
    };
  });
}

export async function searchWebCustomers(
  q: string,
): Promise<Array<{ id: string; name: string; email: string; isActive: boolean }>> {
  const rows = await db
    .select({ 
      id: usersTable.id, 
      name: usersTable.name, 
      email: usersTable.email,
      isActive: usersTable.isActive 
    })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.role, "customer"),
        or(
          ilike(usersTable.name,  `%${q}%`),
          ilike(usersTable.email, `%${q}%`),
        ),
      )
    )
    .limit(10);
  return rows;
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

// ─── Operator queries ─────────────────────────────────────────────────────────

function mapOperatorRow(row: typeof usersTable.$inferSelect): Operator {
  return {
    id:        row.id,
    email:     row.email,
    name:      row.name,
    isActive:  row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findAllOperators(): Promise<Operator[]> {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "operator"))
    .orderBy(desc(usersTable.createdAt));
  return rows.map(mapOperatorRow);
}

export async function createOperator(input: {
  email:        string;
  name:         string;
  passwordHash: string;
}): Promise<Operator> {
  const [row] = await db
    .insert(usersTable)
    .values({
      email:         input.email.toLowerCase(),
      name:          input.name,
      passwordHash:  input.passwordHash,
      role:          "operator",
      emailVerified: true,
      isActive:      true,
      createdAt:     new Date(),
    })
    .returning();
  return mapOperatorRow(row!);
}

export async function updateOperator(
  id:    string,
  input: { name?: string; passwordHash?: string },
): Promise<Operator | undefined> {
  const set: Record<string, unknown> = {};
  if (input.name)         set["name"]         = input.name;
  if (input.passwordHash) set["passwordHash"]  = input.passwordHash;
  if (Object.keys(set).length === 0) return findOperatorById(id);

  const [row] = await db
    .update(usersTable)
    .set(set)
    .where(and(eq(usersTable.id, id), eq(usersTable.role, "operator")))
    .returning();
  return row ? mapOperatorRow(row) : undefined;
}

export async function setOperatorActive(id: string, active: boolean): Promise<void> {
  await db
    .update(usersTable)
    .set({ isActive: active })
    .where(and(eq(usersTable.id, id), eq(usersTable.role, "operator")));
}

export async function setCustomerActive(id: string, active: boolean): Promise<void> {
  await db
    .update(usersTable)
    .set({ isActive: active })
    .where(and(eq(usersTable.id, id), eq(usersTable.role, "customer")));
}

export async function findOperatorById(id: string): Promise<Operator | undefined> {
  const rows = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.id, id), eq(usersTable.role, "operator")));
  return rows[0] ? mapOperatorRow(rows[0]) : undefined;
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
