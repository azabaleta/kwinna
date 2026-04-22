import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { SaleItem } from "@kwinna/contracts";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "operator",
  "customer",
]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "in",
  "out",
  "adjustment",
]);

export const saleStatusEnum = pgEnum("sale_status", [
  "pending",
  "completed",
  "cancelled",
  "assembled",       // completado en la web, listo para despachar (marcado desde POS)
]);

export const saleChannelEnum = pgEnum("sale_channel", [
  "web",
  "pos",
]);

export const analyticsEventTypeEnum = pgEnum("analytics_event_type", [
  "shop_view",
  "cart_add",
  "checkout_start",
  "sale_complete",
]);

export const returnReasonEnum = pgEnum("return_reason", [
  "quality",
  "detail",
  "color",
  "size",
  "not_as_expected",
]);

export const productSeasonEnum = pgEnum("product_season", [
  "invierno",
  "verano",
  "media_estacion",
]);

export const snapshotPeriodEnum = pgEnum("snapshot_period", [
  "monthly",
  "semestral",
]);

// ─── users ────────────────────────────────────────────────────────────────────
// Contrato: UserSchema (packages/contracts/src/schemas/auth.ts)
// Admin y operadores se crean via seed-admin; clientes via POST /auth/register.

export const usersTable = pgTable("users", {
  id:            uuid("id").primaryKey().defaultRandom(),
  email:         varchar("email", { length: 255 }).notNull().unique(),
  name:          varchar("name",  { length: 255 }).notNull(),
  role:          userRoleEnum("role").notNull().default("customer"),
  passwordHash:  text("password_hash").notNull(),
  emailVerified: boolean("email_verified").notNull().default(true),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── email_verification_tokens ────────────────────────────────────────────────
// Tabla de tokens de verificación de email.
// Seguridad: solo se almacena el hash SHA-256 del token; el raw nunca toca la BD.

export const emailVerificationTokensTable = pgTable("email_verification_tokens", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt:    timestamp("used_at",    { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── password_reset_tokens ────────────────────────────────────────────────────
// Igual que email_verification_tokens: solo se almacena el hash SHA-256.
// TTL de 1 hora para mayor seguridad (ventana corta).

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt:    timestamp("used_at",    { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── products ─────────────────────────────────────────────────────────────────
// Contrato: ProductSchema (packages/contracts/src/schemas/product.ts)

export const productsTable = pgTable("products", {
  id:          uuid("id").primaryKey().defaultRandom(),
  name:        varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sku:         varchar("sku", { length: 100 }).notNull().unique(),
  // numeric devuelve string via postgres-js → se convierte a Number en el mapper
  price:       numeric("price", { precision: 12, scale: 2 }).notNull(),
  categoryId:  uuid("category_id"),
  // JSONB arrays — postgres-js los parsea automáticamente a JS arrays
  images:      jsonb("images").$type<string[]>().notNull().default([]),
  tags:        jsonb("tags").$type<string[]>().notNull().default([]),
  season:      productSeasonEnum("season"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── stock ────────────────────────────────────────────────────────────────────
// Contrato: StockSchema
//
// La llave de negocio es (product_id, size).
// size usa '' como centinela para "sin talle" → permite UNIQUE sin NULLs.
// El mapper convierte '' ↔ undefined en el repositorio.

export const stockTable = pgTable(
  "stock",
  {
    id:        uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull().references(() => productsTable.id),
    // NOT NULL + DEFAULT '' evita el problema de NULL en índices únicos (pre-PG15)
    size:      text("size").notNull().default(""),
    quantity:  integer("quantity").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productSizeUniq: uniqueIndex("stock_product_size_uniq").on(
      table.productId,
      table.size
    ),
  })
);

// ─── stock_movements ──────────────────────────────────────────────────────────
// Contrato: StockMovementSchema

export const stockMovementsTable = pgTable("stock_movements", {
  id:        uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  // '' como centinela para "sin talle" — mismo convenio que stockTable
  size:      text("size").notNull().default(""),
  type:      stockMovementTypeEnum("type").notNull(),
  quantity:  integer("quantity").notNull(),
  reason:    text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── sales ────────────────────────────────────────────────────────────────────
// Contrato: SaleSchema
// items se almacena como JSONB — mapea SaleItem[] del contrato.
// Los campos PII (customerEmail, shippingAddress, etc.) solo se exponen
// en endpoints protegidos por authGuard + requireRole(["admin","operator"]).

// ─── analytics_events ─────────────────────────────────────────────────────────
// Eventos ligeros para calcular CR, AOV y tasa de abandono de carrito.
// session_id se genera en el browser con crypto.randomUUID() en sessionStorage.

export const analyticsEventsTable = pgTable("analytics_events", {
  id:        uuid("id").primaryKey().defaultRandom(),
  eventType: analyticsEventTypeEnum("event_type").notNull(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  userId:    uuid("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── sales ────────────────────────────────────────────────────────────────────
export const salesTable = pgTable("sales", {
  id:     uuid("id").primaryKey().defaultRandom(),
  items:  jsonb("items").notNull().$type<SaleItem[]>(),
  total:  numeric("total", { precision: 12, scale: 2 }).notNull(),
  status: saleStatusEnum("status").notNull().default("pending"),

  // ── Customer data (PII) ────────────────────────────────────────────────────
  customerName:  varchar("customer_name", { length: 255 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 50 }),

  // ── Shipping ───────────────────────────────────────────────────────────────
  shippingAddress:  text("shipping_address").notNull(),
  shippingCity:     varchar("shipping_city", { length: 100 }).notNull(),
  shippingProvince: varchar("shipping_province", { length: 100 }).notNull(),
  shippingCost:     numeric("shipping_cost", { precision: 12, scale: 2 }).notNull().default("0"),

  // ── Opcional: cliente registrado ───────────────────────────────────────────
  userId: uuid("user_id"),

  // ── POS metadata ────────────────────────────────────────────────────────────
  channel:       saleChannelEnum("channel").notNull().default("web"),
  paymentMethod: varchar("payment_method", { length: 50 }),   // efectivo | tarjeta | transferencia | otro
  saleNotes:     text("sale_notes"),
  customerDni:   varchar("customer_dni", { length: 20 }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── metric_snapshots ─────────────────────────────────────────────────────────
// Resúmenes periódicos (mensual / semestral) de todas las métricas del negocio.
// El payload completo se almacena como JSONB para ser inmutable en el tiempo.

export const metricSnapshotsTable = pgTable("metric_snapshots", {
  id:        uuid("id").primaryKey().defaultRandom(),
  period:    snapshotPeriodEnum("period").notNull(),
  label:     varchar("label", { length: 100 }).notNull(),
  dateFrom:  timestamp("date_from",  { withTimezone: true }).notNull(),
  dateTo:    timestamp("date_to",    { withTimezone: true }).notNull(),
  data:      jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── returns ──────────────────────────────────────────────────────────────────
// Devoluciones y cambios registrados por admin/operator.
// size usa '' como centinela (igual que stockTable) para "sin talle".
// saleId es opcional: puede registrarse sin tener el ID de la venta a mano.

export const returnsTable = pgTable("returns", {
  id:        uuid("id").primaryKey().defaultRandom(),
  saleId:    uuid("sale_id").references(() => salesTable.id),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  size:      text("size").notNull().default(""),
  quantity:  integer("quantity").notNull().default(1),
  reason:    returnReasonEnum("reason").notNull(),
  notes:     text("notes"),
  // restocked: false = mercadería dañada/perdida (cuenta como pérdida económica)
  restocked: integer("restocked").notNull().default(0), // 0=false, 1=true (bool portable)
  // unitPrice al momento del registro — para calcular pérdidas históricas exactas
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
