import {
  findAllCategories,
  findItemTypesByCategoryId,
  findQualitiesByItemTypeId,
  findVariantsByQualityId,
  insertCategory,
  insertItemType,
  insertQuality,
  insertVariant,
  updateCategory,
  updateItemType,
  updateQuality,
  updateVariant,
  type GlossaryCategory,
  type GlossaryItemType,
  type GlossaryQuality,
  type GlossaryVariant,
} from "../db/repositories/glossary.repository";

// PostgreSQL unique constraint violation code
const PG_UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as Record<string, unknown>)["code"] === PG_UNIQUE_VIOLATION
  );
}

function httpError(message: string, status: number): Error {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = status;
  return err;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function listCategories(): Promise<GlossaryCategory[]> {
  return findAllCategories();
}

export async function createCategory(input: { code: string; name: string }): Promise<GlossaryCategory> {
  try {
    return await insertCategory(input);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw httpError(`Ya existe una categoría con el código "${input.code}"`, 409);
    }
    throw err;
  }
}

export async function renameCategory(id: number, name: string): Promise<GlossaryCategory> {
  const row = await updateCategory(id, name);
  if (!row) throw httpError("Categoría no encontrada", 404);
  return row;
}

// ─── Item types ───────────────────────────────────────────────────────────────

export async function listItemTypes(categoryId: number): Promise<GlossaryItemType[]> {
  return findItemTypesByCategoryId(categoryId);
}

export async function createItemType(input: { categoryId: number; code: string; name: string }): Promise<GlossaryItemType> {
  try {
    return await insertItemType(input);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw httpError(`Ya existe un tipo con el código "${input.code}" en esta categoría`, 409);
    }
    throw err;
  }
}

export async function renameItemType(id: number, name: string): Promise<GlossaryItemType> {
  const row = await updateItemType(id, name);
  if (!row) throw httpError("Tipo de prenda no encontrado", 404);
  return row;
}

// ─── Qualities ────────────────────────────────────────────────────────────────

export async function listQualities(itemTypeId: number): Promise<GlossaryQuality[]> {
  return findQualitiesByItemTypeId(itemTypeId);
}

export async function createQuality(input: { itemTypeId: number; code: string; name: string }): Promise<GlossaryQuality> {
  try {
    return await insertQuality(input);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw httpError(`Ya existe una calidad con el código "${input.code}" en este tipo`, 409);
    }
    throw err;
  }
}

export async function renameQuality(id: number, name: string): Promise<GlossaryQuality> {
  const row = await updateQuality(id, name);
  if (!row) throw httpError("Calidad no encontrada", 404);
  return row;
}

// ─── Variants ─────────────────────────────────────────────────────────────────

export async function listVariants(qualityId: number): Promise<GlossaryVariant[]> {
  return findVariantsByQualityId(qualityId);
}

export async function createVariant(input: { qualityId: number; code: string; name: string }): Promise<GlossaryVariant> {
  try {
    return await insertVariant(input);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw httpError(`Ya existe una variante con el código "${input.code}" en esta calidad`, 409);
    }
    throw err;
  }
}

export async function renameVariant(id: number, name: string): Promise<GlossaryVariant> {
  const row = await updateVariant(id, name);
  if (!row) throw httpError("Variante no encontrada", 404);
  return row;
}
