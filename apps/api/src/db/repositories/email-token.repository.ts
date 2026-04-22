import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../index";
import { emailVerificationTokensTable } from "../schema";

type TokenRow = typeof emailVerificationTokensTable.$inferSelect;

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Busca un token válido (no expirado, no usado) por su hash SHA-256.
 */
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
 * Devuelve el último token no usado (expirado o no) de un usuario.
 * Se usa para aplicar el cooldown entre reenvíos.
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
    .orderBy(emailVerificationTokensTable.createdAt)
    .limit(1);
  return rows[0];
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function insertToken(
  userId:    string,
  tokenHash: string,
  expiresAt: Date,
): Promise<TokenRow> {
  const [row] = await db
    .insert(emailVerificationTokensTable)
    .values({ userId, tokenHash, expiresAt })
    .returning();
  return row!;
}

export async function markTokenUsed(tokenId: string): Promise<void> {
  await db
    .update(emailVerificationTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationTokensTable.id, tokenId));
}
