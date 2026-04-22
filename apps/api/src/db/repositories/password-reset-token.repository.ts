import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "../index";
import { passwordResetTokensTable } from "../schema";

type TokenRow = typeof passwordResetTokensTable.$inferSelect;

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findValidResetToken(
  tokenHash: string,
): Promise<TokenRow | undefined> {
  const now = new Date();
  const rows = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.tokenHash, tokenHash),
        gt(passwordResetTokensTable.expiresAt, now),
        isNull(passwordResetTokensTable.usedAt),
      ),
    );
  return rows[0];
}

export async function findLastResetTokenForUser(
  userId: string,
): Promise<TokenRow | undefined> {
  const rows = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.userId, userId),
        isNull(passwordResetTokensTable.usedAt),
      ),
    )
    .orderBy(desc(passwordResetTokensTable.createdAt))
    .limit(1);
  return rows[0];
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function insertResetToken(
  userId:    string,
  tokenHash: string,
  expiresAt: Date,
): Promise<TokenRow> {
  const [row] = await db
    .insert(passwordResetTokensTable)
    .values({ userId, tokenHash, expiresAt })
    .returning();
  return row!;
}

export async function markResetTokenUsed(tokenId: string): Promise<void> {
  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokensTable.id, tokenId));
}
