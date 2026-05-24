import { eq } from "drizzle-orm";
import type { SocialFormData } from "@kwinna/contracts";
import { db } from "../index";
import { socialFormDraftsTable } from "../schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SocialFormDraftRow {
  data:      SocialFormData;
  updatedAt: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function findDraftByUserId(userId: string): Promise<SocialFormDraftRow | null> {
  const [row] = await db
    .select()
    .from(socialFormDraftsTable)
    .where(eq(socialFormDraftsTable.userId, userId))
    .limit(1);

  if (!row) return null;

  return {
    data:      row.data as SocialFormData,
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function upsertDraft(userId: string, data: SocialFormData): Promise<SocialFormDraftRow> {
  const [row] = await db
    .insert(socialFormDraftsTable)
    .values({ userId, data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: socialFormDraftsTable.userId,
      set:    { data, updatedAt: new Date() },
    })
    .returning();

  return {
    data:      row!.data as SocialFormData,
    updatedAt: row!.updatedAt.toISOString(),
  };
}

export async function deleteDraftByUserId(userId: string): Promise<void> {
  await db
    .delete(socialFormDraftsTable)
    .where(eq(socialFormDraftsTable.userId, userId));
}
