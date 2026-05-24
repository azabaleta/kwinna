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

export const stockBalanceStatusEnum = pgEnum("stock_balance_status", [
  "in_progress",
  "completed",
  "cancelled",
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
  "deportivo",
]);

export const snapshotPeriodEnum = pgEnum("snapshot_period", [
  "monthly",
  "semestral",
]);

// ─── credit_notes ─────────────────────────────────────────────────────────────
// Notas de crédito emitidas al registrar una devolución.
// Tienen un código único legible (NC-XXXXXX) que se imprime en el ticket 58mm.
// Al usarse en una venta se marcan "redeemed". Si el crédito supera el total
// de la nueva venta, se emite una nota residual vinculada por originCreditNoteId.

export const creditNoteStatusEnum = pgEnum("credit_note_status", [
  "active",
  "redeemed",
  "void",
]);

export const creditNotesTable = pgTable(
  "credit_notes",
  {
    id:                 uuid("id").primaryKey().defaultRandom(),
    code:               varchar("code", { length: 20 }).notNull().unique(),
    amount:             numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status:             creditNoteStatusEnum("status").notNull().default("active"),
    customerName:       varchar("customer_name", { length: 255 }),
    customerDni:        varchar("customer_dni",  { length: 20 }),
    posCustomerId:      uuid("pos_customer_id"),
    userId:             uuid("user_id"),
    reason:             returnReasonEnum("reason"),
    returnId:           uuid("return_id"),           // devolución que originó esta nota
    originCreditNoteId: uuid("origin_credit_note_id"), // nota previa (si es residuo)
    redeemedSaleId:     uuid("redeemed_sale_id"),    // venta en la que se canjeó
    redeemedAt:         timestamp("redeemed_at", { withTimezone: true }),
    createdAt:          timestamp("created_at",  { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    returnIdUniq: uniqueIndex("credit_notes_return_id_uniq").on(table.returnId),
  })
);

// ─── pos_customers ────────────────────────────────────────────────────────────
// Clientes del canal POS sin cuenta web. Identificados de forma única por DNI.
// FK opcional en salesTable.posCustomerId; independiente de usersTable.

export const posCustomersTable = pgTable(
  "pos_customers",
  {
    id:        uuid("id").primaryKey().defaultRandom(),
    name:      varchar("name", { length: 255 }).notNull(),
    dni:       varchar("dni", { length: 20 }).notNull(),
    phone:     varchar("phone", { length: 50 }).notNull(),
    email:     varchar("email", { length: 255 }),
    address:   text("address"),
    city:      varchar("city", { length: 100 }),
    province:  varchar("province", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    dniUniq: uniqueIndex("pos_customers_dni_uniq").on(table.dni),
  })
);

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
  isActive:      boolean("is_active").notNull().default(true),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── email_verification_tokens ────────────────────────────────────────────────
// Tabla de tokens de verificación de email.
// Seguridad: solo se almacena el hash SHA-256 del token; el raw nunca toca la BD.

export const emailVerificationTokensTable = pgTable("email_verification_tokens", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  shortCode: varchar("short_code", { length: 6 }).unique(),  // código numérico de 6 dígitos — UNIQUE permite múltiples NULL
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
  showInShop:  boolean("show_in_shop").notNull().default(true),
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

// ─── stock_balances ───────────────────────────────────────────────────────────
// Sesiones de conteo de inventario.

export const stockBalancesTable = pgTable("stock_balances", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  status:             stockBalanceStatusEnum("status").notNull().default("in_progress"),
  notes:              text("notes"),
  createdBy:          uuid("created_by").notNull().references(() => usersTable.id),
  totalLosses:        numeric("total_losses", { precision: 12, scale: 2 }), // en dinero
  totalDiscrepancies: integer("total_discrepancies"), // cantidad de items que no cuadraron
  accuracyPercentage: numeric("accuracy_percentage", { precision: 5, scale: 2 }), // ej 98.50
  createdAt:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt:        timestamp("completed_at", { withTimezone: true }),
});

export const stockBalanceItemsTable = pgTable(
  "stock_balance_items",
  {
    id:               uuid("id").primaryKey().defaultRandom(),
    balanceId:        uuid("balance_id").notNull().references(() => stockBalancesTable.id, { onDelete: "cascade" }),
    productId:        uuid("product_id").notNull().references(() => productsTable.id),
    size:             text("size").notNull().default(""),
    expectedQuantity: integer("expected_quantity"), // Puede ser nulo hasta que se complete (ciego)
    countedQuantity:  integer("counted_quantity").notNull().default(0),
    unitPrice:        numeric("unit_price", { precision: 12, scale: 2 }), // Guardado al momento de completar
    createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    balanceProductSizeUniq: uniqueIndex("stock_balance_items_uniq").on(
      table.balanceId,
      table.productId,
      table.size
    ),
  })
);

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
  shippingZipCode:  varchar("shipping_zip_code", { length: 20 }).notNull().default(""),
  shippingCost:     numeric("shipping_cost", { precision: 12, scale: 2 }).notNull().default("0"),

  // ── Opcional: cliente registrado (web) ────────────────────────────────────
  userId: uuid("user_id"),

  // ── Opcional: cliente POS (sin cuenta web) ────────────────────────────────
  posCustomerId: uuid("pos_customer_id"),

  // ── Opcional: operador que procesó la venta (POS) ─────────────────────────
  vendorId: uuid("vendor_id"),

  // ── Método de envío ─────────────────────────────────────────────────────────
  shippingMethod: varchar("shipping_method", { length: 20 }).notNull().default("delivery"),

  // ── POS metadata ────────────────────────────────────────────────────────────
  channel:       saleChannelEnum("channel").notNull().default("web"),
  paymentMethod: varchar("payment_method", { length: 50 }),   // efectivo | tarjeta | transferencia | otro
  saleNotes:     text("sale_notes"),
  customerDni:   varchar("customer_dni", { length: 20 }),

  // ── Dismissal ───────────────────────────────────────────────────────────────
  isDismissed:   boolean("is_dismissed").notNull().default(false),
  dismissReason: text("dismiss_reason"),

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

// ─── glossary ─────────────────────────────────────────────────────────────────
// Tablas de codificación EAN-8 usadas por autoTags.
// Jerarquía: Category → ItemType → Quality → Variant.
// Los códigos se concatenan para formar los 7 dígitos base del EAN-8.

export const glossaryCategoriesTable = pgTable(
  "glossary_categories",
  {
    id:   integer("id").primaryKey().generatedAlwaysAsIdentity(),
    code: varchar("code", { length: 2 }).notNull().unique(),  // 2 dígitos, ej. "01"
    name: varchar("name", { length: 255 }).notNull(),
  }
);

export const glossaryItemTypesTable = pgTable(
  "glossary_item_types",
  {
    id:         integer("id").primaryKey().generatedAlwaysAsIdentity(),
    categoryId: integer("category_id").notNull().references(() => glossaryCategoriesTable.id, { onDelete: "cascade" }),
    code:       varchar("code", { length: 2 }).notNull(),     // 2 dígitos, ej. "05"
    name:       varchar("name", { length: 255 }).notNull(),
  },
  (table) => ({
    categoryCodeUniq: uniqueIndex("glossary_item_types_category_code_uniq").on(table.categoryId, table.code),
  })
);

export const glossaryQualitiesTable = pgTable(
  "glossary_qualities",
  {
    id:         integer("id").primaryKey().generatedAlwaysAsIdentity(),
    itemTypeId: integer("item_type_id").notNull().references(() => glossaryItemTypesTable.id, { onDelete: "cascade" }),
    code:       varchar("code", { length: 1 }).notNull(),     // 1 dígito, ej. "2"
    name:       varchar("name", { length: 255 }).notNull(),
  },
  (table) => ({
    itemTypeCodeUniq: uniqueIndex("glossary_qualities_item_type_code_uniq").on(table.itemTypeId, table.code),
  })
);

export const glossaryVariantsTable = pgTable(
  "glossary_variants",
  {
    id:        integer("id").primaryKey().generatedAlwaysAsIdentity(),
    qualityId: integer("quality_id").notNull().references(() => glossaryQualitiesTable.id, { onDelete: "cascade" }),
    code:      varchar("code", { length: 2 }).notNull(),      // 2 dígitos, ej. "03"
    name:      varchar("name", { length: 255 }).notNull(),
  },
  (table) => ({
    qualityCodeUniq: uniqueIndex("glossary_variants_quality_code_uniq").on(table.qualityId, table.code),
  })
);

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

// ─── social_form_drafts ───────────────────────────────────────────────────────
// Borrador semanal del formulario de redes sociales.
// Un registro por usuario (upsert). El campo data almacena el JSON completo
// del formulario; la validación de estructura la hace el frontend.

export const socialFormDraftsTable = pgTable(
  "social_form_drafts",
  {
    id:        uuid("id").primaryKey().defaultRandom(),
    userId:    uuid("user_id").notNull(),
    data:      jsonb("data").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdUniq: uniqueIndex("social_form_drafts_user_id_uniq").on(table.userId),
  })
);
