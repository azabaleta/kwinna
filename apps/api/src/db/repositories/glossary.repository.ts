import { asc, eq } from "drizzle-orm";
import { db } from "../index";
import {
  glossaryCategoriesTable,
  glossaryItemTypesTable,
  glossaryQualitiesTable,
  glossaryVariantsTable,
} from "../schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GlossaryCategory = typeof glossaryCategoriesTable.$inferSelect;
export type GlossaryItemType = typeof glossaryItemTypesTable.$inferSelect;
export type GlossaryQuality  = typeof glossaryQualitiesTable.$inferSelect;
export type GlossaryVariant  = typeof glossaryVariantsTable.$inferSelect;

// ─── Categories ───────────────────────────────────────────────────────────────

export async function findAllCategories(): Promise<GlossaryCategory[]> {
  return db.select().from(glossaryCategoriesTable).orderBy(asc(glossaryCategoriesTable.code));
}

export async function insertCategory(input: { code: string; name: string }): Promise<GlossaryCategory> {
  const [row] = await db.insert(glossaryCategoriesTable).values(input).returning();
  return row!;
}

export async function updateCategory(id: number, name: string): Promise<GlossaryCategory | undefined> {
  const [row] = await db
    .update(glossaryCategoriesTable)
    .set({ name })
    .where(eq(glossaryCategoriesTable.id, id))
    .returning();
  return row;
}

// ─── Item types ───────────────────────────────────────────────────────────────

export async function findItemTypesByCategoryId(categoryId: number): Promise<GlossaryItemType[]> {
  return db
    .select()
    .from(glossaryItemTypesTable)
    .where(eq(glossaryItemTypesTable.categoryId, categoryId))
    .orderBy(asc(glossaryItemTypesTable.code));
}

export async function insertItemType(input: { categoryId: number; code: string; name: string }): Promise<GlossaryItemType> {
  const [row] = await db.insert(glossaryItemTypesTable).values(input).returning();
  return row!;
}

export async function updateItemType(id: number, name: string): Promise<GlossaryItemType | undefined> {
  const [row] = await db
    .update(glossaryItemTypesTable)
    .set({ name })
    .where(eq(glossaryItemTypesTable.id, id))
    .returning();
  return row;
}

// ─── Qualities ────────────────────────────────────────────────────────────────

export async function findQualitiesByItemTypeId(itemTypeId: number): Promise<GlossaryQuality[]> {
  return db
    .select()
    .from(glossaryQualitiesTable)
    .where(eq(glossaryQualitiesTable.itemTypeId, itemTypeId))
    .orderBy(asc(glossaryQualitiesTable.code));
}

export async function insertQuality(input: { itemTypeId: number; code: string; name: string }): Promise<GlossaryQuality> {
  const [row] = await db.insert(glossaryQualitiesTable).values(input).returning();
  return row!;
}

export async function updateQuality(id: number, name: string): Promise<GlossaryQuality | undefined> {
  const [row] = await db
    .update(glossaryQualitiesTable)
    .set({ name })
    .where(eq(glossaryQualitiesTable.id, id))
    .returning();
  return row;
}

// ─── Variants ─────────────────────────────────────────────────────────────────

export async function findVariantsByQualityId(qualityId: number): Promise<GlossaryVariant[]> {
  return db
    .select()
    .from(glossaryVariantsTable)
    .where(eq(glossaryVariantsTable.qualityId, qualityId))
    .orderBy(asc(glossaryVariantsTable.code));
}

export async function insertVariant(input: { qualityId: number; code: string; name: string }): Promise<GlossaryVariant> {
  const [row] = await db.insert(glossaryVariantsTable).values(input).returning();
  return row!;
}

export async function updateVariant(id: number, name: string): Promise<GlossaryVariant | undefined> {
  const [row] = await db
    .update(glossaryVariantsTable)
    .set({ name })
    .where(eq(glossaryVariantsTable.id, id))
    .returning();
  return row;
}
