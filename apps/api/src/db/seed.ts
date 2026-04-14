/**
 * Seed script — solo para entornos de desarrollo.
 * Ejecutar con: pnpm --filter @kwinna/api db:seed
 *
 * Usa onConflictDoNothing para ser idempotente: se puede correr
 * múltiples veces sin duplicar datos.
 *
 * IDs fijos para que coincidan con los mocks MSW del frontend (apps/web/src/mocks/db.ts).
 */

import "dotenv/config";
import { db } from "./index";
import { productsTable, stockTable } from "./schema";

// ─── Category UUIDs ────────────────────���──────────────────────────────────────

const CAT_VESTIDOS   = "770e8400-e29b-41d4-a716-446655440001";
const CAT_TOPS       = "770e8400-e29b-41d4-a716-446655440002";
const CAT_PANTALONES = "770e8400-e29b-41d4-a716-446655440003";
const CAT_ACCESORIOS = "770e8400-e29b-41d4-a716-446655440004";

// ─── Products ────────────────────────────��──────────────────────���─────────────

const SEED_PRODUCTS = [
  {
    id:          "550e8400-e29b-41d4-a716-446655440001",
    name:        "Vestido Midi Lino",
    description: "Vestido midi en lino natural, corte recto, tirantes regulables",
    sku:         "VES-MI-LIN-001",
    price:       "85000.00",
    categoryId:  CAT_VESTIDOS,
    images: [
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80",
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80&flip=h",
    ],
    tags:        ["verano", "casual", "lino"],
    createdAt:   new Date("2025-01-10T10:00:00.000Z"),
    updatedAt:   new Date("2025-01-10T10:00:00.000Z"),
  },
  {
    id:          "550e8400-e29b-41d4-a716-446655440002",
    name:        "Vestido Wrap Floral",
    description: "Vestido cruzado con estampado floral, manga larga y escote en V",
    sku:         "VES-WR-FLO-002",
    price:       "72000.00",
    categoryId:  CAT_VESTIDOS,
    images: [
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80",
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80&view=back",
    ],
    tags:        ["floral", "fiesta", "primavera"],
    createdAt:   new Date("2025-01-10T10:00:00.000Z"),
    updatedAt:   new Date("2025-01-10T10:00:00.000Z"),
  },
  {
    id:          "550e8400-e29b-41d4-a716-446655440003",
    name:        "Top Básico Algodón",
    description: "Top recto en algodón pima, disponible en varios colores",
    sku:         "TOP-BA-ALG-003",
    price:       "38000.00",
    categoryId:  CAT_TOPS,
    images: [
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80",
    ],
    tags:        ["básico", "casual", "algodón"],
    createdAt:   new Date("2025-01-10T10:00:00.000Z"),
    updatedAt:   new Date("2025-01-10T10:00:00.000Z"),
  },
  {
    id:          "550e8400-e29b-41d4-a716-446655440004",
    name:        "Pantalón Wide Leg",
    description: "Pantalón de pierna ancha en tela fluida, tiro alto",
    sku:         "PAN-WL-NEG-004",
    price:       "65000.00",
    categoryId:  CAT_PANTALONES,
    images: [
      "https://images.unsplash.com/photo-1594938298603-c8148c4b4f8b?w=800&q=80",
    ],
    tags:        ["wide-leg", "casual", "oficina"],
    createdAt:   new Date("2025-01-10T10:00:00.000Z"),
    updatedAt:   new Date("2025-01-10T10:00:00.000Z"),
  },
  {
    id:          "550e8400-e29b-41d4-a716-446655440005",
    name:        "Cinturón de Cuero Trenzado",
    description: "Cinturón artesanal en cuero trenzado, hebilla dorada",
    sku:         "ACC-CI-CUE-005",
    price:       "28000.00",
    categoryId:  CAT_ACCESORIOS,
    images: [
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
    ],
    tags:        ["accesorio", "cuero", "clásico"],
    createdAt:   new Date("2025-01-10T10:00:00.000Z"),
    updatedAt:   new Date("2025-01-10T10:00:00.000Z"),
  },
] as const;

// ──�� Stock bifurcado por talle ────────────────��───────────────────────────────
// size: '' = centinela para "sin talle" (accesorios, etc.)

const SEED_STOCK = [
  // Vestido Midi Lino — talles S, M, L
  { id: "660e8400-e29b-41d4-a716-446655440001", productId: "550e8400-e29b-41d4-a716-446655440001", size: "S",  quantity: 5,  updatedAt: new Date("2025-01-10T10:00:00.000Z") },
  { id: "660e8400-e29b-41d4-a716-446655440011", productId: "550e8400-e29b-41d4-a716-446655440001", size: "M",  quantity: 3,  updatedAt: new Date("2025-01-10T10:00:00.000Z") },
  { id: "660e8400-e29b-41d4-a716-446655440012", productId: "550e8400-e29b-41d4-a716-446655440001", size: "L",  quantity: 0,  updatedAt: new Date("2025-01-10T10:00:00.000Z") },

  // Vestido Wrap Floral — talles XS, S, M
  { id: "660e8400-e29b-41d4-a716-446655440002", productId: "550e8400-e29b-41d4-a716-446655440002", size: "XS", quantity: 2,  updatedAt: new Date("2025-01-10T10:00:00.000Z") },
  { id: "660e8400-e29b-41d4-a716-446655440013", productId: "550e8400-e29b-41d4-a716-446655440002", size: "S",  quantity: 0,  updatedAt: new Date("2025-01-10T10:00:00.000Z") },
  { id: "660e8400-e29b-41d4-a716-446655440014", productId: "550e8400-e29b-41d4-a716-446655440002", size: "M",  quantity: 4,  updatedAt: new Date("2025-01-10T10:00:00.000Z") },

  // Top Básico — talles S, M, L, XL
  { id: "660e8400-e29b-41d4-a716-446655440003", productId: "550e8400-e29b-41d4-a716-446655440003", size: "S",  quantity: 4,  updatedAt: new Date("2025-01-10T10:00:00.000Z") },
  { id: "660e8400-e29b-41d4-a716-446655440015", productId: "550e8400-e29b-41d4-a716-446655440003", size: "M",  quantity: 8,  updatedAt: new Date("2025-01-10T10:00:00.000Z") },
  { id: "660e8400-e29b-41d4-a716-446655440016", productId: "550e8400-e29b-41d4-a716-446655440003", size: "L",  quantity: 0,  updatedAt: new Date("2025-01-10T10:00:00.000Z") },
  { id: "660e8400-e29b-41d4-a716-446655440017", productId: "550e8400-e29b-41d4-a716-446655440003", size: "XL", quantity: 3,  updatedAt: new Date("2025-01-10T10:00:00.000Z") },

  // Pantalón Wide Leg — talles S, M, L
  { id: "660e8400-e29b-41d4-a716-446655440004", productId: "550e8400-e29b-41d4-a716-446655440004", size: "S",  quantity: 10, updatedAt: new Date("2025-01-10T10:00:00.000Z") },
  { id: "660e8400-e29b-41d4-a716-446655440018", productId: "550e8400-e29b-41d4-a716-446655440004", size: "M",  quantity: 8,  updatedAt: new Date("2025-01-10T10:00:00.000Z") },
  { id: "660e8400-e29b-41d4-a716-446655440019", productId: "550e8400-e29b-41d4-a716-446655440004", size: "L",  quantity: 2,  updatedAt: new Date("2025-01-10T10:00:00.000Z") },

  // Cinturón — sin talle (centinela '')
  { id: "660e8400-e29b-41d4-a716-446655440005", productId: "550e8400-e29b-41d4-a716-446655440005", size: "",   quantity: 0,  updatedAt: new Date("2025-01-10T10:00:00.000Z") },
] as const;

// ─── Runner ─────────────────────��───────────────────────────��─────────────────

async function seed() {
  console.log("\x1b[36m[seed]\x1b[0m Seeding database…");

  await db
    .insert(productsTable)
    .values(
      SEED_PRODUCTS.map((p) => ({
        ...p,
        images: [...p.images],
        tags:   [...p.tags],
      }))
    )
    .onConflictDoNothing();

  console.log(`\x1b[32m[seed]\x1b[0m ✓ ${SEED_PRODUCTS.length} products`);

  await db
    .insert(stockTable)
    .values(SEED_STOCK.map((s) => ({ ...s })))
    .onConflictDoNothing();

  console.log(`\x1b[32m[seed]\x1b[0m ✓ ${SEED_STOCK.length} stock entries`);
  console.log("\x1b[32m[seed]\x1b[0m Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("\x1b[31m[seed]\x1b[0m Failed:", err);
  process.exit(1);
});
