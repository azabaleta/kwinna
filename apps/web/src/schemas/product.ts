import { z } from "zod";
import { ProductCreateInputSchema } from "@kwinna/contracts";

// ─── ProductFormSchema ────────────────────────────────────────────────────────
// Extiende el contrato para React Hook Form: price usa z.coerce para convertir
// el string del <input type="number"> en number antes de la validación Zod.

// Override images/tags to remove .default([]) — avoids z.input/output split
// that confuses react-hook-form + @hookform/resolvers v5. Defaults live in useForm.
export const ProductFormSchema = ProductCreateInputSchema.extend({
  price: z.coerce
    .number({ invalid_type_error: "Ingresá un precio válido" })
    .positive({ message: "El precio debe ser mayor a $0" }),
  images: z.array(z.string().url({ message: "Ingresá una URL válida" })),
  tags:   z.array(z.string()),
});

export type ProductFormValues = z.infer<typeof ProductFormSchema>;

// ─── Category map ─────────────────────────────────────────────────────────────
// Sincronizado con mocks/db.ts y el seed de la API.

export const CATEGORIES = [
  { id: "770e8400-e29b-41d4-a716-446655440001", label: "Vestidos" },
  { id: "770e8400-e29b-41d4-a716-446655440002", label: "Tops" },
  { id: "770e8400-e29b-41d4-a716-446655440003", label: "Pantalones" },
  { id: "770e8400-e29b-41d4-a716-446655440004", label: "Accesorios" },
] as const;
