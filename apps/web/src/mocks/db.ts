import type { Product, Sale, Stock, StockMovement } from "@kwinna/contracts";

// ─── Category UUIDs ───────────────────────────────────────────────────────────
// Deben coincidir con CATEGORY_ID_MAP en shop/page.tsx y con el seed de la API.

export const CATEGORY_VESTIDOS   = "770e8400-e29b-41d4-a716-446655440001";
export const CATEGORY_TOPS       = "770e8400-e29b-41d4-a716-446655440002";
export const CATEGORY_PANTALONES = "770e8400-e29b-41d4-a716-446655440003";
export const CATEGORY_ACCESORIOS = "770e8400-e29b-41d4-a716-446655440004";

// ─── Products ─────────────────────────────────────────────────────────────────

export const products: Product[] = [
  {
    id:          "550e8400-e29b-41d4-a716-446655440001",
    name:        "Vestido Midi Lino",
    description: "Vestido midi en lino natural, corte recto, tirantes regulables",
    sku:         "VES-MI-LIN-001",
    price:       85000,
    categoryId:  CATEGORY_VESTIDOS,
    images: [
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80",
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80&flip=h",
    ],
    tags:        ["verano", "casual", "lino"],
    createdAt:   "2025-01-10T10:00:00.000Z",
    updatedAt:   "2025-01-10T10:00:00.000Z",
  },
  {
    id:          "550e8400-e29b-41d4-a716-446655440002",
    name:        "Vestido Wrap Floral",
    description: "Vestido cruzado con estampado floral, manga larga y escote en V",
    sku:         "VES-WR-FLO-002",
    price:       72000,
    categoryId:  CATEGORY_VESTIDOS,
    images: [
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80",
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80&view=back",
    ],
    tags:        ["floral", "fiesta", "primavera"],
    createdAt:   "2025-01-10T10:00:00.000Z",
    updatedAt:   "2025-01-10T10:00:00.000Z",
  },
  {
    id:          "550e8400-e29b-41d4-a716-446655440003",
    name:        "Top Básico Algodón",
    description: "Top recto en algodón pima, disponible en varios colores",
    sku:         "TOP-BA-ALG-003",
    price:       38000,
    categoryId:  CATEGORY_TOPS,
    images: [
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80",
    ],
    tags:        ["básico", "casual", "algodón"],
    createdAt:   "2025-01-10T10:00:00.000Z",
    updatedAt:   "2025-01-10T10:00:00.000Z",
  },
  {
    id:          "550e8400-e29b-41d4-a716-446655440004",
    name:        "Pantalón Wide Leg",
    description: "Pantalón de pierna ancha en tela fluida, tiro alto",
    sku:         "PAN-WL-NEG-004",
    price:       65000,
    categoryId:  CATEGORY_PANTALONES,
    images: [
      "https://images.unsplash.com/photo-1594938298603-c8148c4b4f8b?w=800&q=80",
    ],
    tags:        ["wide-leg", "casual", "oficina"],
    createdAt:   "2025-01-10T10:00:00.000Z",
    updatedAt:   "2025-01-10T10:00:00.000Z",
  },
  {
    id:          "550e8400-e29b-41d4-a716-446655440005",
    name:        "Cinturón de Cuero Trenzado",
    description: "Cinturón artesanal en cuero trenzado, hebilla dorada",
    sku:         "ACC-CI-CUE-005",
    price:       28000,
    categoryId:  CATEGORY_ACCESORIOS,
    images: [
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
    ],
    tags:        ["accesorio", "cuero", "clásico"],
    createdAt:   "2025-01-10T10:00:00.000Z",
    updatedAt:   "2025-01-10T10:00:00.000Z",
  },
];

// ─── Stock bifurcado por talle ────────────────────────────────────────────────
// size === undefined → sin talle (accesorios)

export const stock: Stock[] = [
  // Vestido Midi Lino
  { id: "660e8400-e29b-41d4-a716-446655440001", productId: "550e8400-e29b-41d4-a716-446655440001", size: "S",  quantity: 5,  updatedAt: "2025-01-10T10:00:00.000Z" },
  { id: "660e8400-e29b-41d4-a716-446655440011", productId: "550e8400-e29b-41d4-a716-446655440001", size: "M",  quantity: 3,  updatedAt: "2025-01-10T10:00:00.000Z" },
  { id: "660e8400-e29b-41d4-a716-446655440012", productId: "550e8400-e29b-41d4-a716-446655440001", size: "L",  quantity: 0,  updatedAt: "2025-01-10T10:00:00.000Z" },
  // Vestido Wrap Floral
  { id: "660e8400-e29b-41d4-a716-446655440002", productId: "550e8400-e29b-41d4-a716-446655440002", size: "XS", quantity: 2,  updatedAt: "2025-01-10T10:00:00.000Z" },
  { id: "660e8400-e29b-41d4-a716-446655440013", productId: "550e8400-e29b-41d4-a716-446655440002", size: "S",  quantity: 0,  updatedAt: "2025-01-10T10:00:00.000Z" },
  { id: "660e8400-e29b-41d4-a716-446655440014", productId: "550e8400-e29b-41d4-a716-446655440002", size: "M",  quantity: 4,  updatedAt: "2025-01-10T10:00:00.000Z" },
  // Top Básico
  { id: "660e8400-e29b-41d4-a716-446655440003", productId: "550e8400-e29b-41d4-a716-446655440003", size: "S",  quantity: 4,  updatedAt: "2025-01-10T10:00:00.000Z" },
  { id: "660e8400-e29b-41d4-a716-446655440015", productId: "550e8400-e29b-41d4-a716-446655440003", size: "M",  quantity: 8,  updatedAt: "2025-01-10T10:00:00.000Z" },
  { id: "660e8400-e29b-41d4-a716-446655440016", productId: "550e8400-e29b-41d4-a716-446655440003", size: "L",  quantity: 0,  updatedAt: "2025-01-10T10:00:00.000Z" },
  { id: "660e8400-e29b-41d4-a716-446655440017", productId: "550e8400-e29b-41d4-a716-446655440003", size: "XL", quantity: 3,  updatedAt: "2025-01-10T10:00:00.000Z" },
  // Pantalón Wide Leg
  { id: "660e8400-e29b-41d4-a716-446655440004", productId: "550e8400-e29b-41d4-a716-446655440004", size: "S",  quantity: 10, updatedAt: "2025-01-10T10:00:00.000Z" },
  { id: "660e8400-e29b-41d4-a716-446655440018", productId: "550e8400-e29b-41d4-a716-446655440004", size: "M",  quantity: 8,  updatedAt: "2025-01-10T10:00:00.000Z" },
  { id: "660e8400-e29b-41d4-a716-446655440019", productId: "550e8400-e29b-41d4-a716-446655440004", size: "L",  quantity: 2,  updatedAt: "2025-01-10T10:00:00.000Z" },
  // Cinturón (sin talle)
  { id: "660e8400-e29b-41d4-a716-446655440005", productId: "550e8400-e29b-41d4-a716-446655440005", size: undefined, quantity: 0, updatedAt: "2025-01-10T10:00:00.000Z" },
];

export const stockMovements: StockMovement[] = [];

export const sales: Sale[] = [
  {
    id:               "aa0e8400-e29b-41d4-a716-446655440001",
    items: [
      { productId: "550e8400-e29b-41d4-a716-446655440001", quantity: 1, unitPrice: 85000, subtotal: 85000, size: "M" },
    ],
    total:            88500,
    status:           "completed",
    channel:          "web",
    customerName:     "Valentina Romero",
    customerEmail:    "valentina@example.com",
    customerPhone:    "+54 299 4112233",
    shippingAddress:  "Av. Argentina 1234",
    shippingCity:     "Neuquén",
    shippingProvince: "Neuquén",
    shippingZipCode:  "8300",
    shippingMethod:   "delivery",
    shippingCost:     3500,
    isDismissed:      false,
    createdAt:        "2026-04-10T14:30:00.000Z",
    updatedAt:        "2026-04-10T14:30:00.000Z",
  },
  {
    id:               "aa0e8400-e29b-41d4-a716-446655440002",
    items: [
      { productId: "550e8400-e29b-41d4-a716-446655440003", quantity: 2, unitPrice: 38000, subtotal: 76000, size: "S" },
      { productId: "550e8400-e29b-41d4-a716-446655440005", quantity: 1, unitPrice: 28000, subtotal: 28000 },
    ],
    total:            107500,
    status:           "pending",
    channel:          "web",
    customerName:     "Lucía Fernández",
    customerEmail:    "lucia.fern@gmail.com",
    customerPhone:    "+54 299 5556677",
    shippingAddress:  "Calle Chile 567, Piso 3",
    shippingCity:     "Cipolletti",
    shippingProvince: "Río Negro",
    shippingZipCode:  "8324",
    shippingMethod:   "delivery",
    shippingCost:     3500,
    isDismissed:      false,
    createdAt:        "2026-04-13T09:15:00.000Z",
    updatedAt:        "2026-04-13T09:15:00.000Z",
  },
  {
    id:               "aa0e8400-e29b-41d4-a716-446655440003",
    items: [
      { productId: "550e8400-e29b-41d4-a716-446655440002", quantity: 1, unitPrice: 72000, subtotal: 72000, size: "XS" },
    ],
    total:            72000,
    status:           "cancelled",
    channel:          "web",
    customerName:     "Martina López",
    customerEmail:    "martina.l@hotmail.com",
    customerPhone:    undefined,
    shippingAddress:  "Las Heras 890",
    shippingCity:     "Neuquén",
    shippingProvince: "Neuquén",
    shippingZipCode:  "8300",
    shippingMethod:   "delivery",
    shippingCost:     0,
    isDismissed:      false,
    createdAt:        "2026-04-11T18:00:00.000Z",
    updatedAt:        "2026-04-12T10:00:00.000Z",
  },
];
