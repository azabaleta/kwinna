import { z } from "zod";
import { ProductCreateInputSchema, ProductSeasonSchema } from "@kwinna/contracts";

// ─── Base shape ───────────────────────────────────────────────────────────────
// Separado del schema final para poder reutilizar la refinación en create y edit.

const baseFormFields = {
  price: z.coerce
    .number({ invalid_type_error: "Ingresá un precio válido" })
    .positive({ message: "El precio debe ser mayor a $0" }),
  images: z.array(z.string().url({ message: "Ingresá una URL válida" })),
  tags:   z.array(z.string()),
  season: ProductSeasonSchema.optional(),
};

// Temporada requerida salvo que el producto lleve el tag "Accesorios".
function requireSeasonUnlessAccessory(
  data: { tags: string[]; season?: string },
  ctx: z.RefinementCtx,
) {
  if (!data.tags.includes("Accesorios") && !data.season) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      message: "Seleccioná una temporada (obligatorio para prendas)",
      path:    ["season"],
    });
  }
}

// ─── ProductFormSchema ────────────────────────────────────────────────────────

export const ProductFormSchema = ProductCreateInputSchema
  .extend(baseFormFields)
  .superRefine(requireSeasonUnlessAccessory);

export type ProductFormValues = z.infer<typeof ProductFormSchema>;

// ─── ProductUpdateFormSchema ──────────────────────────────────────────────────
// Para el formulario de edición: idéntico al de creación pero sin SKU.

export const ProductUpdateFormSchema = ProductCreateInputSchema
  .omit({ sku: true })
  .extend(baseFormFields)
  .superRefine(requireSeasonUnlessAccessory);

export type ProductUpdateFormValues = z.infer<typeof ProductUpdateFormSchema>;

// ─── Category map ─────────────────────────────────────────────────────────────
// Sincronizado con mocks/db.ts y el seed de la API.

export const CATEGORIES = [
  { id: "770e8400-e29b-41d4-a716-446655440001", label: "Calzas" },
  { id: "770e8400-e29b-41d4-a716-446655440002", label: "Tops" },
  { id: "770e8400-e29b-41d4-a716-446655440003", label: "Musculosas" },
  { id: "770e8400-e29b-41d4-a716-446655440004", label: "Remeras" },
  { id: "770e8400-e29b-41d4-a716-446655440005", label: "Accesorios" },
  { id: "770e8400-e29b-41d4-a716-446655440006", label: "Otros" },
] as const;

// ─── Product tags ─────────────────────────────────────────────────────────────
// Fuente única de verdad para los filtros de la tienda y los formularios admin.
// "Accesorios" exime al producto de la etiqueta de temporada obligatoria.

export const PRODUCT_TAGS = [
  "Calzas Oxford",
  "Calzas Chupin",
  "Calzas rectas",
  "Calzas pescadoras",
  "Calzas 3/4",
  "Bikers",
  "Shorts",
  "Push Up",
  "Con friza",
  "Sin friza",
  "Tops deportivos",
  "Corpiños",
  "Less",
  "Vedetinas",
  "Bombis",
  "Musculosas",
  "Remeras",
  "Camperas",
  "Buzos",
  "Medias",
  "Deportivo",
  "Accesorios",
] as const;

export type ProductTag = (typeof PRODUCT_TAGS)[number];

export const ACCESSORY_TAG = "Accesorios" as const;
