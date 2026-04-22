import { eq } from "drizzle-orm";
import type { User } from "@kwinna/contracts";
import { db } from "../index";
import { usersTable } from "../schema";

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
