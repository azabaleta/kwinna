import express from 'express'
import cors from 'cors'
import { PrismaClient, Prisma } from '@prisma/client'
import { z } from 'zod'
import { calculateCheckDigit } from '../src/utils/barcode.js'

const db = new PrismaClient()
const app = express()
app.use(express.json())
app.use(cors({ origin: 'http://localhost:5173' }))

// ─── Schemas de validación ────────────────────────────────────────────────────

const categorySchema = z.object({
  code: z.string().length(2),
  name: z.string().min(1),
})

const qualitySchema = z.object({
  itemTypeId: z.number().int().positive(),
  code: z.string().length(1),
  name: z.string().min(1),
})

const itemTypeSchema = z.object({
  categoryId: z.number().int().positive(),
  code: z.string().length(2),
  name: z.string().min(1),
})

const variantSchema = z.object({
  qualityId: z.number().int().positive(),
  code: z.string().length(2),
  name: z.string().min(1),
})

const renameSchema = z.object({
  name: z.string().min(1),
})

const productSchema = z.object({
  sevenDigits: z.string().regex(/^\d{7}$/),
  description: z.string().min(1),
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isUniqueError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
}

function isNotFoundError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025'
}

function err(res: express.Response, status: number, message: string) {
  return res.status(status).json({ error: message })
}

// ─── Categorías ──────────────────────────────────────────────────────────────

app.get('/api/categories', async (_req, res) => {
  const data = await db.category.findMany({ orderBy: { code: 'asc' } })
  res.json(data)
})

app.post('/api/categories', async (req, res) => {
  const parsed = categorySchema.safeParse(req.body)
  if (!parsed.success) return err(res, 400, parsed.error.issues[0].message)
  try {
    const data = await db.category.create({ data: parsed.data })
    res.status(201).json(data)
  } catch (e) {
    if (isUniqueError(e)) return err(res, 409, `Ya existe una categoría con el código "${parsed.data.code}"`)
    throw e
  }
})

app.patch('/api/categories/:id', async (req, res) => {
  const parsed = renameSchema.safeParse(req.body)
  if (!parsed.success) return err(res, 400, parsed.error.issues[0].message)
  try {
    const data = await db.category.update({ where: { id: Number(req.params.id) }, data: parsed.data })
    res.json(data)
  } catch (e) {
    if (isNotFoundError(e)) return err(res, 404, 'Categoría no encontrada')
    throw e
  }
})

// ─── Calidades ────────────────────────────────────────────────────────────────

app.get('/api/qualities', async (req, res) => {
  const itemTypeId = Number(req.query.itemTypeId)
  if (!itemTypeId) return err(res, 400, 'itemTypeId requerido')
  const data = await db.quality.findMany({
    where: { itemTypeId },
    orderBy: { code: 'asc' },
  })
  res.json(data)
})

app.post('/api/qualities', async (req, res) => {
  const parsed = qualitySchema.safeParse(req.body)
  if (!parsed.success) return err(res, 400, parsed.error.issues[0].message)
  try {
    const data = await db.quality.create({ data: parsed.data })
    res.status(201).json(data)
  } catch (e) {
    if (isUniqueError(e))
      return err(res, 409, `Ya existe una calidad con el código "${parsed.data.code}" en este tipo de prenda`)
    throw e
  }
})

app.patch('/api/qualities/:id', async (req, res) => {
  const parsed = renameSchema.safeParse(req.body)
  if (!parsed.success) return err(res, 400, parsed.error.issues[0].message)
  try {
    const data = await db.quality.update({ where: { id: Number(req.params.id) }, data: parsed.data })
    res.json(data)
  } catch (e) {
    if (isNotFoundError(e)) return err(res, 404, 'Calidad no encontrada')
    throw e
  }
})

// ─── Tipos de prenda ──────────────────────────────────────────────────────────

app.get('/api/item-types', async (req, res) => {
  const categoryId = Number(req.query.categoryId)
  if (!categoryId) return err(res, 400, 'categoryId requerido')
  const data = await db.itemType.findMany({
    where: { categoryId },
    orderBy: { code: 'asc' },
  })
  res.json(data)
})

app.post('/api/item-types', async (req, res) => {
  const parsed = itemTypeSchema.safeParse(req.body)
  if (!parsed.success) return err(res, 400, parsed.error.issues[0].message)
  try {
    const data = await db.itemType.create({ data: parsed.data })
    res.status(201).json(data)
  } catch (e) {
    if (isUniqueError(e))
      return err(res, 409, `Ya existe un tipo con el código "${parsed.data.code}" en esta categoría`)
    throw e
  }
})

app.patch('/api/item-types/:id', async (req, res) => {
  const parsed = renameSchema.safeParse(req.body)
  if (!parsed.success) return err(res, 400, parsed.error.issues[0].message)
  try {
    const data = await db.itemType.update({ where: { id: Number(req.params.id) }, data: parsed.data })
    res.json(data)
  } catch (e) {
    if (isNotFoundError(e)) return err(res, 404, 'Tipo de prenda no encontrado')
    throw e
  }
})

// ─── Variantes ────────────────────────────────────────────────────────────────

app.get('/api/variants', async (req, res) => {
  const qualityId = Number(req.query.qualityId)
  if (!qualityId) return err(res, 400, 'qualityId requerido')
  const data = await db.variant.findMany({
    where: { qualityId },
    orderBy: { code: 'asc' },
  })
  res.json(data)
})

app.post('/api/variants', async (req, res) => {
  const parsed = variantSchema.safeParse(req.body)
  if (!parsed.success) return err(res, 400, parsed.error.issues[0].message)
  try {
    const data = await db.variant.create({ data: parsed.data })
    res.status(201).json(data)
  } catch (e) {
    if (isUniqueError(e))
      return err(res, 409, `Ya existe una variante con el código "${parsed.data.code}" en esta calidad`)
    throw e
  }
})

app.patch('/api/variants/:id', async (req, res) => {
  const parsed = renameSchema.safeParse(req.body)
  if (!parsed.success) return err(res, 400, parsed.error.issues[0].message)
  try {
    const data = await db.variant.update({ where: { id: Number(req.params.id) }, data: parsed.data })
    res.json(data)
  } catch (e) {
    if (isNotFoundError(e)) return err(res, 404, 'Variante no encontrada')
    throw e
  }
})

// ─── Productos ────────────────────────────────────────────────────────────────

app.get('/api/products', async (req, res) => {
  const prefix = typeof req.query.prefix === 'string' ? req.query.prefix : ''
  const data = await db.product.findMany({
    where: prefix ? { fullCode: { startsWith: prefix } } : undefined,
    orderBy: { fullCode: 'asc' },
  })
  res.json(data)
})

app.post('/api/products', async (req, res) => {
  const parsed = productSchema.safeParse(req.body)
  if (!parsed.success) return err(res, 400, parsed.error.issues[0].message)
  const { sevenDigits, description } = parsed.data
  const checkDigit = calculateCheckDigit(sevenDigits)
  const fullCode = `${sevenDigits}${checkDigit}`
  try {
    const data = await db.product.create({ data: { fullCode, description } })
    res.status(201).json(data)
  } catch (e) {
    if (isUniqueError(e)) return err(res, 409, `El código EAN-8 "${fullCode}" ya existe`)
    throw e
  }
})

// ─── Arranque ─────────────────────────────────────────────────────────────────

const PORT = 3001
app.listen(PORT, () => console.log(`API server → http://localhost:${PORT}`))
