import { z } from "zod";

// ─── Promo Strip (barra promocional) ──────────────────────────────────────────
// Configuración singleton de la barra fina que promociona un código promocional
// entre el navbar y el contenido de la tienda. Editable desde /admin/promotions.
//
// El strip es puramente publicitario: NO genera códigos. El código promocionado
// se elige de la tabla de promo codes (única fuente de verdad) vía `promoCodeId`;
// `code` es el valor resuelto de ese código (solo lectura). Al hacer click, si
// `copyEnabled`, copia al portapapeles el texto libre `copyText`.

// promoCodeId: string simple (no z.uuid) para tolerar IDs de mocks; la integridad
// real la garantiza la columna uuid + FK en la base.

export const PromoStripSchema = z.object({
  enabled:     z.boolean(),
  message:     z.string(),                    // texto publicitario libre
  promoCodeId: z.string().nullable(),         // código promocionado (FK a promo codes)
  code:        z.string().nullable(),         // resuelto: el `code` del promo code (o null)
  copyText:    z.string(),                    // texto que se copia al click
  copyEnabled: z.boolean(),
  updatedAt:   z.string().datetime(),
});

export type PromoStrip = z.infer<typeof PromoStripSchema>;

// ─── Input (PUT /promo-strip) ─────────────────────────────────────────────────
// Todos los campos opcionales: el admin puede togglear estado sin reenviar texto.
// `code` no se acepta desde el cliente — se deriva de `promoCodeId` en el server.

export const PromoStripUpdateInputSchema = z.object({
  enabled:     z.boolean().optional(),
  message:     z.string().max(200, "Máximo 200 caracteres").optional(),
  promoCodeId: z.string().nullable().optional(),   // null → sin código promocionado
  copyText:    z.string().max(100, "Máximo 100 caracteres").optional(),
  copyEnabled: z.boolean().optional(),
});

export type PromoStripUpdateInput = z.infer<typeof PromoStripUpdateInputSchema>;

// ─── API wrapper ──────────────────────────────────────────────────────────────

export const PromoStripResponseSchema = z.object({ data: PromoStripSchema });
export type PromoStripResponse = z.infer<typeof PromoStripResponseSchema>;
