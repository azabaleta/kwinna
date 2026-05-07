import { Prisma } from '@prisma/client'
import { db } from '../lib/db'
import { buildEAN8 } from '../utils/barcode'
import {
  categorySchema,
  qualitySchema,
  itemTypeSchema,
  variantSchema,
  saveProductSchema,
  type CategoryInput,
  type QualityInput,
  type ItemTypeInput,
  type VariantInput,
  type SaveProductInput,
} from '../lib/validations'

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getCategories() {
  return db.category.findMany({ orderBy: { code: 'asc' } })
}

export async function getQualities(itemTypeId: number) {
  return db.quality.findMany({
    where: { itemTypeId },
    orderBy: { code: 'asc' },
  })
}

export async function getItemTypes(categoryId: number) {
  return db.itemType.findMany({
    where: { categoryId },
    orderBy: { code: 'asc' },
  })
}

export async function getVariants(qualityId: number) {
  return db.variant.findMany({
    where: { qualityId },
    orderBy: { code: 'asc' },
  })
}

// ─── Mutaciones ─────────────────────────────────────────────────────────────

export async function createCategory(input: CategoryInput) {
  categorySchema.parse(input)
  try {
    return await db.category.create({ data: input })
  } catch (e) {
    if (isPrismaUniqueError(e)) {
      throw new Error(`Ya existe una categoría con el código "${input.code}"`)
    }
    throw e
  }
}

export async function createQuality(input: QualityInput) {
  qualitySchema.parse(input)
  try {
    return await db.quality.create({ data: input })
  } catch (e) {
    if (isPrismaUniqueError(e)) {
      throw new Error(`Ya existe una calidad con el código "${input.code}" en este tipo de prenda`)
    }
    throw e
  }
}

export async function createItemType(input: ItemTypeInput) {
  itemTypeSchema.parse(input)
  try {
    return await db.itemType.create({ data: input })
  } catch (e) {
    if (isPrismaUniqueError(e)) {
      throw new Error(
        `Ya existe un tipo de prenda con el código "${input.code}" en esta categoría`
      )
    }
    throw e
  }
}

export async function createVariant(input: VariantInput) {
  variantSchema.parse(input)
  try {
    return await db.variant.create({ data: input })
  } catch (e) {
    if (isPrismaUniqueError(e)) {
      throw new Error(
        `Ya existe una variante con el código "${input.code}" en esta calidad`
      )
    }
    throw e
  }
}

export async function saveProduct(input: SaveProductInput) {
  const { sevenDigits, description } = saveProductSchema.parse(input)
  const fullCode = buildEAN8(sevenDigits)
  try {
    return await db.product.create({ data: { fullCode, description } })
  } catch (e) {
    if (isPrismaUniqueError(e)) {
      throw new Error(`El producto con código EAN-8 "${fullCode}" ya existe`)
    }
    throw e
  }
}

// ─── Util ────────────────────────────────────────────────────────────────────

function isPrismaUniqueError(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
  )
}
