import {
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

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "in",
  "out",
  "adjustment",
]);

export const saleStatusEnum = pgEnum("sale_status", [
  "pending",
  "completed",
  "cancelled",
]);

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

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
