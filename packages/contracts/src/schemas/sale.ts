import { z } from "zod";

// ─── SaleItem Sub-schema ──────────────────────────────────────────────────────
// size cruza con StockSchema para deducción exacta por variante de talle.

export const SaleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity:  z.number().int().positive(),
  unitPrice: z.number().positive(),
  subtotal:  z.number().positive(),
  size:      z.string().optional(),
});

export type SaleItem = z.infer<typeof SaleItemSchema>;

// ─── Sale Entity ──────────────────────────────────────────────────────────────
// Contiene PII del cliente — sólo exponer a roles admin/operator.

export const SaleSchema = z.object({
  id:     z.string().uuid(),
  items:  z.array(SaleItemSchema),
  total:  z.number().positive(),
  status: z.enum(["pending", "completed", "cancelled"]),

  // ── Customer data (PII) ────────────────────────────────────────────────────
  customerName:  z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),

  // ── Shipping ───────────────────────────────────────────────────────────────
  shippingAddress:  z.string().min(1),
  shippingCity:     z.string().min(1),
  shippingProvince: z.string().min(1),
  shippingCost:     z.number().nonnegative(),

  // ── Opcional: cliente registrado ───────────────────────────────────────────
  userId: z.string().uuid().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Sale = z.infer<typeof SaleSchema>;

// ─── SaleOrderItemSchema / SaleOrderInputSchema ───────────────────────────────
// Shape que el CLIENTE envía en POST /sales y POST /sales/checkout.
//
// SEGURIDAD: el cliente NO envía precios ni totales.
// El backend consulta el precio real de cada productId en PostgreSQL,
// calcula subtotales y total, y deriva shippingCost desde shippingCity.
// Ningún valor monetario puede ser inyectado desde el frontend.

export const SaleOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity:  z.number().int().positive(),
  size:      z.string().optional(),
});

export type SaleOrderItem = z.infer<typeof SaleOrderItemSchema>;

export const SaleOrderInputSchema = z.object({
  items:            z.array(SaleOrderItemSchema).min(1),
  customerName:     z.string().min(1),
  customerEmail:    z.string().email(),
  customerPhone:    z.string().optional(),
  shippingAddress:  z.string().min(1),
  shippingCity:     z.string().min(1),
  shippingProvince: z.string().min(1),
  userId:           z.string().uuid().optional(),
  // total y shippingCost son calculados exclusivamente por el backend
});

export type SaleOrderInput = z.infer<typeof SaleOrderInputSchema>;

// ─── SaleCreateInputSchema ────────────────────────────────────────────────────
// Shape INTERNA del backend — con precios computados, pasada al repositorio.
// Nunca expuesta como validador de requests de clientes externos.

export const SaleCreateInputSchema = SaleSchema.omit({
  id:        true,
  status:    true,
  createdAt: true,
  updatedAt: true,
});

export type SaleCreateInput = z.infer<typeof SaleCreateInputSchema>;

// ─── API Wrappers ─────────────────────────────────────────────────────────────

export const SaleResponseSchema = z.object({
  data: SaleSchema,
});

export type SaleResponse = z.infer<typeof SaleResponseSchema>;

export const SaleListResponseSchema = z.object({
  data: z.array(SaleSchema),
});

export type SaleListResponse = z.infer<typeof SaleListResponseSchema>;

// ─── Checkout (MP) Response ───────────────────────────────────────────────────
// Devuelto por POST /sales/checkout.
// initPoint es la URL de MP a la que el frontend redirige al usuario.

export const SaleCheckoutResponseSchema = z.object({
  data: z.object({
    sale:      SaleSchema,
    initPoint: z.string().url(),
  }),
});

export type SaleCheckoutResponse = z.infer<typeof SaleCheckoutResponseSchema>;
