import { http, HttpResponse } from "msw";
import {
  ProductCreateInputSchema,
  ProductListResponseSchema,
  ProductResponseSchema,
  SaleListResponseSchema,
  SaleOrderInputSchema,
  SaleResponseSchema,
  StockListResponseSchema,
  StockMovementSchema,
  type Product,
  type Sale,
  type SaleItem,
  type StockMovement,
} from "@kwinna/contracts";
import { z } from "zod";
import { products, sales, stock, stockMovements } from "./db";

// ─── Mock shipping (espeja la lógica de shipping.service.ts del backend) ──────

function normalizeCity(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
const LOCAL_CITIES = new Set(["neuquen", "plottier", "cipolletti", "centenario"]);
function mockShippingCost(city: string): number {
  return LOCAL_CITIES.has(normalizeCity(city)) ? 3_500 : 0;
}

const BASE = "http://localhost:3001";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

function uuid() {
  return crypto.randomUUID();
}

function validationError(issues: z.ZodIssue[]) {
  return HttpResponse.json(
    { error: "Validation error", issues },
    { status: 422 }
  );
}

function notFound(message: string) {
  return HttpResponse.json({ error: message }, { status: 404 });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const handlers = [
  // GET /products
  http.get(`${BASE}/products`, () => {
    const parsed = ProductListResponseSchema.parse({ data: products });
    return HttpResponse.json(parsed);
  }),

  // POST /products
  http.post(`${BASE}/products`, async ({ request }) => {
    const body = await request.json();
    const result = ProductCreateInputSchema.safeParse(body);
    if (!result.success) return validationError(result.error.issues);

    const product: Product = {
      id:          uuid(),
      name:        result.data.name,
      description: result.data.description,
      sku:         result.data.sku,
      price:       result.data.price,
      categoryId:  result.data.categoryId,
      images:      result.data.images,
      tags:        result.data.tags,
      createdAt:   now(),
      updatedAt:   now(),
    };
    products.push(product);
    const parsed = ProductResponseSchema.parse({ data: product });
    return HttpResponse.json(parsed, { status: 201 });
  }),

  // GET /products/:id
  http.get(`${BASE}/products/:id`, ({ params }) => {
    const product = products.find((p) => p.id === params["id"]);
    if (!product) return notFound("Product not found");
    const parsed = ProductResponseSchema.parse({ data: product });
    return HttpResponse.json(parsed);
  }),

  // GET /stock
  http.get(`${BASE}/stock`, () => {
    const parsed = StockListResponseSchema.parse({ data: stock });
    return HttpResponse.json(parsed);
  }),

  // GET /stock/:productId — retorna TODAS las variantes de talle del producto
  http.get(`${BASE}/stock/:productId`, ({ params }) => {
    const entries = stock.filter((s) => s.productId === params["productId"]);
    if (entries.length === 0) return notFound("Stock entry not found");
    const parsed = StockListResponseSchema.parse({ data: entries });
    return HttpResponse.json(parsed);
  }),

  // POST /stock/in — incrementa stock para (productId, size)
  http.post(`${BASE}/stock/in`, async ({ request }) => {
    const body = await request.json();

    const MovementInputSchema = z.object({
      productId: z.string().uuid(),
      quantity:  z.number().int().positive(),
      size:      z.string().optional(),
      reason:    z.string().optional(),
    });

    const result = MovementInputSchema.safeParse(body);
    if (!result.success) return validationError(result.error.issues);

    const { productId, quantity, size, reason } = result.data;

    const product = products.find((p) => p.id === productId);
    if (!product) return notFound("Product not found");

    // Upsert: buscar fila con mismo (productId, size)
    const existing = stock.find(
      (s) => s.productId === productId && s.size === size
    );

    if (existing) {
      existing.quantity += quantity;
      existing.updatedAt = now();
    } else {
      stock.push({
        id:        uuid(),
        productId,
        size,
        quantity,
        updatedAt: now(),
      });
    }

    const movement: StockMovement = {
      id: uuid(),
      productId,
      type: "in",
      quantity,
      reason,
      createdAt: now(),
    };
    stockMovements.push(movement);

    return HttpResponse.json(
      { data: StockMovementSchema.parse(movement) },
      { status: 201 }
    );
  }),

  // POST /sales — registra venta y descuenta stock
  // Valida contra SaleOrderInputSchema — precios calculados desde mock products[]
  http.post(`${BASE}/sales`, async ({ request }) => {
    const body = await request.json();

    const result = SaleOrderInputSchema.safeParse(body);
    if (!result.success) return validationError(result.error.issues);

    const { items, customerName, customerEmail, customerPhone,
            shippingAddress, shippingCity, shippingProvince, userId } = result.data;

    // Verificar disponibilidad antes de procesar (por talle si aplica)
    for (const item of items) {
      if (item.size) {
        const entry = stock.find((s) => s.productId === item.productId && s.size === item.size);
        if (!entry || entry.quantity < item.quantity) {
          return HttpResponse.json(
            { error: "Insufficient stock", productId: item.productId, size: item.size,
              available: entry?.quantity ?? 0, requested: item.quantity },
            { status: 409 }
          );
        }
      } else {
        const entries = stock.filter((s) => s.productId === item.productId);
        const totalAvailable = entries.reduce((sum, s) => sum + s.quantity, 0);
        if (totalAvailable < item.quantity) {
          return HttpResponse.json(
            { error: "Insufficient stock", productId: item.productId,
              available: totalAvailable, requested: item.quantity },
            { status: 409 }
          );
        }
      }
    }

    // Calcular precios desde mock DB (mismo patrón que el backend real)
    const saleItems: SaleItem[] = [];
    let productSubtotal = 0;

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        return HttpResponse.json({ error: "Producto no encontrado", productId: item.productId }, { status: 404 });
      }
      const subtotal = product.price * item.quantity;
      productSubtotal += subtotal;
      saleItems.push({ productId: item.productId, quantity: item.quantity,
                       unitPrice: product.price, subtotal, size: item.size });
    }

    const shippingCost = mockShippingCost(shippingCity);
    const total = productSubtotal + shippingCost;

    // Descontar stock + registrar movimientos
    for (const item of saleItems) {
      if (item.size) {
        const entry = stock.find((s) => s.productId === item.productId && s.size === item.size);
        if (entry) { entry.quantity -= item.quantity; entry.updatedAt = now(); }
      } else {
        const entries = stock.filter((s) => s.productId === item.productId)
          .sort((a, b) => b.quantity - a.quantity);
        let remaining = item.quantity;
        for (const entry of entries) {
          if (remaining <= 0) break;
          const deduct = Math.min(entry.quantity, remaining);
          entry.quantity -= deduct; entry.updatedAt = now(); remaining -= deduct;
        }
      }
      stockMovements.push({
        id: uuid(), productId: item.productId, type: "out",
        quantity: item.quantity, reason: "sale", createdAt: now(),
      });
    }

    const sale: Sale = {
      id: uuid(), items: saleItems, total, status: "completed",
      customerName, customerEmail, customerPhone,
      shippingAddress, shippingCity, shippingProvince, shippingCost, userId,
      createdAt: now(), updatedAt: now(),
    };
    sales.push(sale);

    return HttpResponse.json({ data: sale }, { status: 201 });
  }),

  // GET /sales — lista todas las ventas (admin/operator)
  http.get(`${BASE}/sales`, () => {
    const parsed = SaleListResponseSchema.parse({ data: sales });
    return HttpResponse.json(parsed);
  }),

  // PUT /sales/:id/cancel — cancela venta pending y restaura stock
  http.put(`${BASE}/sales/:id/cancel`, ({ params }) => {
    const id = params["id"] as string;
    const sale = sales.find((s) => s.id === id);

    if (!sale) {
      return HttpResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }
    if (sale.status !== "pending") {
      return HttpResponse.json(
        { error: `Solo se pueden cancelar ventas en estado pending. Estado actual: ${sale.status}` },
        { status: 422 }
      );
    }

    // Restaurar stock por cada item
    for (const item of sale.items) {
      const entry = stock.find(
        (s) =>
          s.productId === item.productId &&
          (item.size ? s.size === item.size : (s.size === undefined || s.size === ""))
      );
      if (entry) {
        entry.quantity += item.quantity;
        entry.updatedAt = new Date().toISOString();
      }
    }

    // Marcar como cancelled
    sale.status = "cancelled";
    sale.updatedAt = new Date().toISOString();

    const parsed = SaleResponseSchema.parse({ data: sale });
    return HttpResponse.json(parsed);
  }),

  // POST /sales/checkout — mock del Checkout Pro con MercadoPago
  // Valida contra SaleOrderInputSchema — precios calculados desde mock products[]
  http.post(`${BASE}/sales/checkout`, async ({ request }) => {
    const body = await request.json();

    const result = SaleOrderInputSchema.safeParse(body);
    if (!result.success) return validationError(result.error.issues);

    const { items, customerName, customerEmail, customerPhone,
            shippingAddress, shippingCity, shippingProvince, userId } = result.data;

    // Verificar disponibilidad
    for (const item of items) {
      if (item.size) {
        const entry = stock.find((s) => s.productId === item.productId && s.size === item.size);
        if (!entry || entry.quantity < item.quantity) {
          return HttpResponse.json(
            { error: "Insufficient stock", productId: item.productId, size: item.size,
              available: entry?.quantity ?? 0, requested: item.quantity },
            { status: 409 }
          );
        }
      } else {
        const entries = stock.filter((s) => s.productId === item.productId);
        const available = entries.reduce((sum, s) => sum + s.quantity, 0);
        if (available < item.quantity) {
          return HttpResponse.json(
            { error: "Insufficient stock", productId: item.productId,
              available, requested: item.quantity },
            { status: 409 }
          );
        }
      }
    }

    // Calcular precios desde mock DB
    const saleItems: SaleItem[] = [];
    let productSubtotal = 0;

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        return HttpResponse.json({ error: "Producto no encontrado", productId: item.productId }, { status: 404 });
      }
      const subtotal = product.price * item.quantity;
      productSubtotal += subtotal;
      saleItems.push({ productId: item.productId, quantity: item.quantity,
                       unitPrice: product.price, subtotal, size: item.size });
    }

    const shippingCost = mockShippingCost(shippingCity);
    const total = productSubtotal + shippingCost;

    // Descontar stock
    for (const item of saleItems) {
      if (item.size) {
        const entry = stock.find((s) => s.productId === item.productId && s.size === item.size);
        if (entry) { entry.quantity -= item.quantity; entry.updatedAt = now(); }
      } else {
        const entries = stock.filter((s) => s.productId === item.productId)
          .sort((a, b) => b.quantity - a.quantity);
        let remaining = item.quantity;
        for (const entry of entries) {
          if (remaining <= 0) break;
          const deduct = Math.min(entry.quantity, remaining);
          entry.quantity -= deduct; entry.updatedAt = now(); remaining -= deduct;
        }
      }
      stockMovements.push({
        id: uuid(), productId: item.productId, type: "out",
        quantity: item.quantity, reason: "sale", createdAt: now(),
      });
    }

    const sale: Sale = {
      id: uuid(), items: saleItems, total,
      status: "pending",
      customerName, customerEmail, customerPhone,
      shippingAddress, shippingCity, shippingProvince, shippingCost, userId,
      createdAt: now(), updatedAt: now(),
    };
    sales.push(sale);

    const initPoint = `http://localhost:3000/checkout/success`;
    return HttpResponse.json({ data: { sale, initPoint } }, { status: 201 });
  }),
];
