import { z } from 'zod'

export const categorySchema = z.object({
  code: z.string().length(2, 'El código de categoría debe tener exactamente 2 caracteres'),
  name: z.string().min(1, 'El nombre es obligatorio'),
})

export const qualitySchema = z.object({
  itemTypeId: z.number().int().positive(),
  code: z.string().length(1, 'El código de calidad debe tener exactamente 1 carácter'),
  name: z.string().min(1, 'El nombre es obligatorio'),
})

export const itemTypeSchema = z.object({
  categoryId: z.number().int().positive(),
  code: z.string().length(2, 'El código de tipo de prenda debe tener exactamente 2 caracteres'),
  name: z.string().min(1, 'El nombre es obligatorio'),
})

export const variantSchema = z.object({
  qualityId: z.number().int().positive(),
  code: z.string().length(2, 'El código de variante debe tener exactamente 2 caracteres'),
  name: z.string().min(1, 'El nombre es obligatorio'),
})

export const saveProductSchema = z.object({
  sevenDigits: z
    .string()
    .regex(/^\d{7}$/, 'Debe contener exactamente 7 dígitos numéricos'),
  description: z.string().min(1, 'La descripción es obligatoria'),
})

export type CategoryInput = z.infer<typeof categorySchema>
export type QualityInput = z.infer<typeof qualitySchema>
export type ItemTypeInput = z.infer<typeof itemTypeSchema>
export type VariantInput = z.infer<typeof variantSchema>
export type SaveProductInput = z.infer<typeof saveProductSchema>
