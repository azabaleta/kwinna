import { z } from "zod";

// Única fuente de verdad de la clave `city`: minúsculas, sin espacios extremos
// ni diacríticos. La usan el backend (persistencia/lookup), el checkout web
// (preview de costo) y los mocks MSW — deben coincidir siempre.
export function normalizeCity(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export const ShippingZoneSchema = z.object({
  id:          z.string().uuid(),
  city:        z.string(),        // key normalizado (minúsculas, sin tildes): "neuquen"
  displayName: z.string(),        // nombre visible: "Neuquén"
  cost:        z.number().nonnegative(),
  updatedAt:   z.string().datetime(),
});

export type ShippingZone = z.infer<typeof ShippingZoneSchema>;

export const ShippingZoneCreateInputSchema = z.object({
  displayName: z.string().min(2, "Mínimo 2 caracteres").max(100),
  cost:        z.number({ invalid_type_error: "El costo debe ser un número" }).nonnegative("El costo no puede ser negativo").int("El costo debe ser un número entero"),
});
export type ShippingZoneCreateInput = z.infer<typeof ShippingZoneCreateInputSchema>;

export const ShippingZoneUpdateInputSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  cost:        z.number().nonnegative().int().optional(),
});
export type ShippingZoneUpdateInput = z.infer<typeof ShippingZoneUpdateInputSchema>;

export const ShippingZoneListResponseSchema = z.object({
  data: z.array(ShippingZoneSchema),
});
export type ShippingZoneListResponse = z.infer<typeof ShippingZoneListResponseSchema>;

export const ShippingZoneResponseSchema = z.object({
  data: ShippingZoneSchema,
});
export type ShippingZoneResponse = z.infer<typeof ShippingZoneResponseSchema>;
