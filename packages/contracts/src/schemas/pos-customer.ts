import { z } from "zod";

// ─── PosCustomer entity ───────────────────────────────────────────────────────
// Clientes del canal POS que no tienen cuenta en el ecommerce web.
// Se identifican de forma única por DNI.

export const PosCustomerSchema = z.object({
  id:        z.string().uuid(),
  name:      z.string().min(1),
  dni:       z.string().min(1),
  phone:     z.string().min(1),
  email:     z.string().email().optional(),
  address:   z.string().optional(),
  city:      z.string().optional(),
  province:  z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PosCustomer = z.infer<typeof PosCustomerSchema>;

// ─── Create input ─────────────────────────────────────────────────────────────

export const PosCustomerCreateInputSchema = z.object({
  name:     z.string().min(1, "Nombre obligatorio").max(255).trim(),
  dni:      z.string().min(1, "DNI obligatorio").max(20).trim(),
  phone:    z.string().min(1, "Teléfono obligatorio").max(50).trim(),
  email:    z.string().email().max(255).optional(),
  address:  z.string().max(500).optional(),
  city:     z.string().max(100).optional(),
  province: z.string().max(100).optional(),
});

export type PosCustomerCreateInput = z.infer<typeof PosCustomerCreateInputSchema>;

// ─── Search result ────────────────────────────────────────────────────────────
// Tipo unificado que mezcla resultados de clientes web y POS.

export const CustomerSearchResultSchema = z.object({
  source:   z.enum(["web", "pos"]),
  id:       z.string().uuid(),
  name:     z.string(),
  email:    z.string().optional(),
  phone:    z.string().optional(),
  dni:      z.string().optional(),
  address:  z.string().optional(),
  city:     z.string().optional(),
  province: z.string().optional(),
});

export type CustomerSearchResult = z.infer<typeof CustomerSearchResultSchema>;

export const CustomerSearchResponseSchema = z.object({
  data: z.array(CustomerSearchResultSchema),
});

export type CustomerSearchResponse = z.infer<typeof CustomerSearchResponseSchema>;

export const PosCustomerResponseSchema = z.object({
  data: PosCustomerSchema,
});

export type PosCustomerResponse = z.infer<typeof PosCustomerResponseSchema>;
