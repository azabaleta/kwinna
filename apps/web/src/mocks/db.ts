import type { Product, Sale, Stock, StockMovement } from "@kwinna/contracts";

// ─── Seed Data ────────────────────────────────────────────────────────────────

export const products: Product[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Yerba Mate Amanda 500g",
    description: "Yerba mate tradicional argentina",
    sku: "YM-AM-500",
    price: 1850,
    categoryId: "770e8400-e29b-41d4-a716-446655440001",
    createdAt: "2024-01-10T10:00:00.000Z",
    updatedAt: "2024-01-10T10:00:00.000Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Aceite Natura 900ml",
    description: "Aceite de girasol refinado",
    sku: "AC-NA-900",
    price: 2100,
    categoryId: "770e8400-e29b-41d4-a716-446655440002",
    createdAt: "2024-01-10T10:00:00.000Z",
    updatedAt: "2024-01-10T10:00:00.000Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    name: "Leche La Serenísima 1L",
    description: "Leche entera larga vida",
    sku: "LE-LS-1L",
    price: 950,
    categoryId: "770e8400-e29b-41d4-a716-446655440003",
    createdAt: "2024-01-10T10:00:00.000Z",
    updatedAt: "2024-01-10T10:00:00.000Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440004",
    name: "Arroz Gallo Oro 1kg",
    description: "Arroz largo fino",
    sku: "AR-GO-1KG",
    price: 1200,
    categoryId: "770e8400-e29b-41d4-a716-446655440002",
    createdAt: "2024-01-10T10:00:00.000Z",
    updatedAt: "2024-01-10T10:00:00.000Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440005",
    name: "Fideos Matarazzo 500g",
    description: "Fideos spaghetti n°5",
    sku: "FI-MA-500",
    price: 780,
    categoryId: "770e8400-e29b-41d4-a716-446655440002",
    createdAt: "2024-01-10T10:00:00.000Z",
    updatedAt: "2024-01-10T10:00:00.000Z",
  },
];

export const stock: Stock[] = [
  {
    id: "660e8400-e29b-41d4-a716-446655440001",
    productId: "550e8400-e29b-41d4-a716-446655440001",
    quantity: 48,
    updatedAt: "2024-01-10T10:00:00.000Z",
  },
  {
    id: "660e8400-e29b-41d4-a716-446655440002",
    productId: "550e8400-e29b-41d4-a716-446655440002",
    quantity: 30,
    updatedAt: "2024-01-10T10:00:00.000Z",
  },
  {
    id: "660e8400-e29b-41d4-a716-446655440003",
    productId: "550e8400-e29b-41d4-a716-446655440003",
    quantity: 60,
    updatedAt: "2024-01-10T10:00:00.000Z",
  },
  {
    id: "660e8400-e29b-41d4-a716-446655440004",
    productId: "550e8400-e29b-41d4-a716-446655440004",
    quantity: 25,
    updatedAt: "2024-01-10T10:00:00.000Z",
  },
  {
    id: "660e8400-e29b-41d4-a716-446655440005",
    productId: "550e8400-e29b-41d4-a716-446655440005",
    quantity: 80,
    updatedAt: "2024-01-10T10:00:00.000Z",
  },
];

export const stockMovements: StockMovement[] = [];

export const sales: Sale[] = [];
