import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "../index";
import { emailVerificationTokensTable } from "../schema";

type TokenRow = typeof emailVerificationTokensTable.$inferSelect;

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findValidToken(
  tokenHash: string,
): Promise<TokenRow | undefined> {
  const now = new Date();
  const rows = await db
    .select()
    .from(emailVerificationTokensTable)
    .where(
      and(
        eq(emailVerificationTokensTable.tokenHash, tokenHash),
        gt(emailVerificationTokensTable.expiresAt, now),
        isNull(emailVerificationTokensTable.usedAt),
      ),
    );
  return rows[0];
}

/**
 * Busca un token válido por su código corto de 6 dígitos.
 * Usado como alternativa al link cuando el email cae en spam.
 */
export async function findValidTokenByCode(
  code: string,
): Promise<TokenRow | undefined> {
  const now = new Date();
  const rows = await db
    .select()
    .from(emailVerificationTokensTable)
    .where(
      and(
        eq(emailVerificationTokensTable.shortCode, code),
        gt(emailVerificationTokensTable.expiresAt, now),
        isNull(emailVerificationTokensTable.usedAt),
      ),
    );
  return rows[0];
}

/**
 * Devuelve el último token no usado de un usuario (para cooldown entre reenvíos).
 */
export async function findLastTokenForUser(
  userId: string,
): Promise<TokenRow | undefined> {
  const rows = await db
    .select()
    .from(emailVerificationTokensTable)
    .where(
      and(
        eq(emailVerificationTokensTable.userId, userId),
        isNull(emailVerificationTokensTable.usedAt),
      ),
    )
    .orderBy(desc(emailVerificationTokensTable.createdAt))
    .limit(1);
  return rows[0];
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function insertToken(
  userId:    string,
  tokenHash: string,
  expiresAt: Date,
  shortCode?: string,
): Promise<TokenRow> {
  // Hasta 3 intentos en caso de colisión de short_code (1 en 900.000 por intento).
  // Si el llamador no pasó shortCode, el insert es directo sin retry.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [row] = await db
        .insert(emailVerificationTokensTable)
        .values({ userId, tokenHash, expiresAt, shortCode })
        .returning();
      return row!;
    } catch (err) {
      const isDuplicateCode =
        shortCode &&
        err instanceof Error &&
        err.message.includes("short_code");

      if (!isDuplicateCode || attempt === 2) throw err;

      // Colisión en short_code — regenerar y reintentar
      const { randomBytes } = await import("node:crypto");
      const bytes = randomBytes(3);
      shortCode = String((bytes.readUIntBE(0, 3) % 900000) + 100000);
    }
  }
  throw new Error("No se pudo generar un código único tras 3 intentos");
}

export async function markTokenUsed(tokenId: string): Promise<void> {
  await db
    .update(emailVerificationTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationTokensTable.id, tokenId));
}
