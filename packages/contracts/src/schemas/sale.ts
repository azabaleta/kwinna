import { z } from "zod";

// ─── SaleItem Sub-schema ──────────────────────────────────────────────────────
// size cruza con StockSchema para deducción exacta por variante de talle.

export const SaleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity:  z.number().int().positive(),
  unitPrice: z.number().positive(),
  subtotal:  z.number().positive(),
  size:      z.string().optional(),
  // Artículo libre: descripción ingresada a mano en el POS (sin entrada en catálogo)
  name:      z.string().max(200).optional(),
});

export type SaleItem = z.infer<typeof SaleItemSchema>;

// ─── Sale Entity ──────────────────────────────────────────────────────────────
// Contiene PII del cliente — sólo exponer a roles admin/operator.

// Ciclo de vida de una orden:
//   pending → completed → assembled → delivered   (cancelled corta desde pending)
// "completed" = pagado.  En canal web se muestra además como "Para armar".
// "assembled" = armado en el local.  "delivered" = entregado al cliente.
export const SaleStatusSchema = z.enum(["pending", "completed", "cancelled", "assembled", "delivered"]);
export type SaleStatus = z.infer<typeof SaleStatusSchema>;

// Estados que representan una venta cobrada (ingreso real): pagada y todas las
// posteriores del flujo (pagado → armado → entregado). Excluye `pending` (aún
// sin cobrar) y `cancelled`.
// FUENTE ÚNICA para TODAS las métricas de ingreso/unidades/ventas: usar
// `isPaidSale` en lugar de comparar contra "completed" a mano, para que un pedido
// web que avanza a armado/entregado no desaparezca de los totales.
export const PAID_SALE_STATUSES: readonly SaleStatus[] = ["completed", "assembled", "delivered"];

export function isPaidSale(status: SaleStatus): boolean {
  return PAID_SALE_STATUSES.includes(status);
}

export const SaleChannelSchema = z.enum(["web", "pos"]);
export type SaleChannel = z.infer<typeof SaleChannelSchema>;

export const ShippingMethodSchema = z.enum(["delivery", "pickup"]);
export type ShippingMethod = z.infer<typeof ShippingMethodSchema>;

export const PaymentMethodSchema = z.enum([
  "mercadopago",
  "transfer",
  "transferencia",    // alias usado por el POS de escritorio
  "efectivo",
  "debito",
  "credito",
  "orden_de_compra",
  "por_devolucion",   // crédito de devolución — excluido de métricas de ingresos
]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PriceTierSchema = z.enum(["lista", "efectivo", "mayorista"]);
export type PriceTier = z.infer<typeof PriceTierSchema>;

// ─── Precios canal POS (tienda física) ────────────────────────────────────────
// Fórmula canónica de lista de precios: descuento sobre el precio base,
// redondeado hacia ARRIBA al múltiplo de $500 siguiente. POS, web admin y
// backend deben usar esta única función — si divergen, el ticket impreso
// no coincide con la venta registrada en la BD.
// SOLO para el canal POS (vendorId presente): el canal web nunca redondea.
export function applyPriceTier(basePrice: number, tier?: PriceTier): number {
  if (!tier || tier === "lista") return basePrice;
  const factor = tier === "efectivo" ? 0.8 : 0.65;
  // Redondear a pesos enteros antes del ceil: un epsilon de coma flotante
  // (p. ej. 6500.0000000001) saltaría un múltiplo completo de $500.
  return Math.ceil(Math.round(basePrice * factor) / 500) * 500;
}

// ─── Precios canal WEB (e-commerce) ───────────────────────────────────────────
// La web aplica 20% de descuento pagando por transferencia bancaria, SIN
// redondeo, sobre el mismo precio de lista que consume el POS. Los cupones
// promocionales se suman aparte (promo-code.service). Cards, detalle de
// producto, carrito, checkout y backend deben derivar de estas constantes.
export const TRANSFER_DISCOUNT_RATE = 0.20;

export function applyTransferDiscount(basePrice: number): number {
  return basePrice * (1 - TRANSFER_DISCOUNT_RATE);
}

export const SaleSchema = z.object({
  id:     z.string().uuid(),
  items:  z.array(SaleItemSchema),
  total:  z.number().positive(),
  status: SaleStatusSchema,

  // ── Customer data (PII) ────────────────────────────────────────────────────
  customerName:  z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),  // opcional en entidad — puede ser vacío en ventas históricas
  customerDni:   z.string().optional(),  // opcional en entidad — puede ser vacío en ventas históricas

  // ── Shipping ───────────────────────────────────────────────────────────────
  shippingAddress:  z.string(),   // POS sales store "" — no min(1) on entity schema
  shippingCity:     z.string(),
  shippingProvince: z.string(),
  shippingZipCode:  z.string().default(""),  // default "" para ventas históricas sin CP
  shippingCost:     z.number().nonnegative(),

  // ── Método de envío ───────────────────────────────────────────────────────
  shippingMethod: ShippingMethodSchema.default("delivery"),

  // ── Canal y metadata POS ───────────────────────────────────────────────────
  channel:       SaleChannelSchema.default("web"),
  paymentMethod: PaymentMethodSchema.optional().catch(undefined),
  saleNotes:     z.string().optional(),

  // ── Opcional: cliente registrado (web) ────────────────────────────────────
  userId:         z.string().uuid().optional(),

  // ── Opcional: cliente POS (sin cuenta web) ────────────────────────────────
  posCustomerId:  z.string().uuid().optional(),

  // ── Opcional: operador que procesó la venta (POS) ─────────────────────────
  vendorId:       z.string().uuid().optional(),

  // ── Dismissal ───────────────────────────────────────────────────────────────
  isDismissed:   z.boolean().default(false),
  dismissReason: z.string().nullable().optional(),

  // ── Código promocional ────────────────────────────────────────────────────
  promoCodeId:   z.string().uuid().nullable().optional(),
  promoDiscount: z.number().nonnegative().default(0),

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
  quantity:  z.number().int().positive().max(99, "La cantidad no puede superar 99 unidades por ítem"),
  size:      z.string().max(20).optional(),
});

export type SaleOrderItem = z.infer<typeof SaleOrderItemSchema>;

// ─── Artículo libre (POS-only) ────────────────────────────────────────────────
// UUID centinela para artículos fuera de catálogo vendidos a mano desde el POS.
// No existe como fila en productsTable — solo aparece en el JSONB de salesTable.items.
// Usar esta constante en API y cliente para evitar "magic strings" desincronizados.
export const LIBRE_PRODUCT_ID = "00000000-0000-0000-0000-000000000001" as const;

// Ítem sin entrada en catálogo: precio ingresado a mano por el operador.
// El backend confía el precio solo cuando channel=pos y vendorId están presentes.

export const CustomSaleItemInputSchema = z.object({
  description: z.string().min(1, "Descripción requerida").max(200),
  unitPrice:   z.number({ invalid_type_error: "Precio inválido" }).positive("El precio debe ser mayor a 0"),
  quantity:    z.number().int().positive().max(99),
});

export type CustomSaleItemInput = z.infer<typeof CustomSaleItemInputSchema>;

export const SaleOrderInputSchema = z.object({
  items: z.array(SaleOrderItemSchema).max(30, "El carrito no puede superar 30 ítems distintos").default([]),
  customerName:     z.string().min(1).max(100),
  customerEmail:    z.string().email().max(255),
  customerPhone:    z.string().max(30).optional(),    // opcional: POS puede omitirlo
  shippingAddress:  z.string().max(200).optional(),   // opcional: POS venta en mostrador
  shippingCity:     z.string().max(100).optional(),   // opcional: POS venta en mostrador
  shippingProvince: z.string().max(100).optional(),   // opcional: POS venta en mostrador
  shippingZipCode:  z.string().max(20).optional(),
  userId:           z.string().uuid().optional(),
  posCustomerId:    z.string().uuid().optional(),
  vendorId:         z.string().uuid().optional(),
  // total y shippingCost son calculados exclusivamente por el backend

  // ── Método de envío ───────────────────────────────────────────────────────
  shippingMethod: ShippingMethodSchema.optional(),     // opcional: POS siempre usa "delivery"

  // ── POS metadata (opcionales — solo el cliente de mostrador los envía) ───
  channel:       SaleChannelSchema.optional(),
  paymentMethod: PaymentMethodSchema.optional(),
  priceTier:     PriceTierSchema.optional(),
  saleNotes:     z.string().max(500).optional(),
  customerDni:   z.string().max(20).optional(),       // opcional: POS puede omitirlo
  creditNoteId:  z.string().uuid().optional(),         // nota de crédito a canjear (por_devolucion)
  customItems:   z.array(CustomSaleItemInputSchema).max(20).optional(), // artículos libres POS
  promoCode:     z.string().max(50).optional(),        // código promocional (web checkout)
}).superRefine((data, ctx) => {
  const hasItems = (data.items?.length ?? 0) > 0 || (data.customItems?.length ?? 0) > 0;
  if (!hasItems) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      message: "La venta debe tener al menos un artículo",
      path:    ["items"],
    });
  }
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

import { CreditNoteSchema } from "./credit-note";

export const SaleResponseSchema = z.object({
  data:               SaleSchema,
  residualCreditNote: CreditNoteSchema.optional(),
});

export type SaleResponse = z.infer<typeof SaleResponseSchema>;

export const SaleListResponseSchema = z.object({
  data: z.array(SaleSchema),
});

export type SaleListResponse = z.infer<typeof SaleListResponseSchema>;

// ─── Checkout Response ────────────────────────────────────────────────────────
// Devuelto por POST /sales/checkout.
//
// initPoint es la URL de pago de MercadoPago a la que el frontend redirige al
// usuario. Solo está presente cuando paymentMethod === "mercadopago".
//
// Para paymentMethod === "transfer" el backend NO genera una Preference de MP,
// por lo que initPoint se omite: la venta queda en estado `pending` y el frontend
// redirige a la pantalla de datos bancarios (/checkout/success). Marcarlo como
// opcional mantiene un único contrato válido para ambos métodos de pago y evita
// que el cliente rechace una respuesta legítima de transferencia.
//
// Cuando initPoint está presente debe ser una URL https válida (el frontend la
// re-valida contra el allowlist de dominios oficiales de MP antes de redirigir).

export const SaleCheckoutResponseSchema = z.object({
  data: z.object({
    sale:      SaleSchema,
    initPoint: z.string().url().optional(),
  }),
});

export type SaleCheckoutResponse = z.infer<typeof SaleCheckoutResponseSchema>;

// ─── Dismiss Sale ─────────────────────────────────────────────────────────────

export const SaleDismissInputSchema = z.object({
  reason:       z.string().min(1, "El motivo es requerido").max(500),
  restoreStock: z.boolean().default(false),
});

export type SaleDismissInput = z.infer<typeof SaleDismissInputSchema>;
