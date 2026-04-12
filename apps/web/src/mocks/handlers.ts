import { http, HttpResponse } from "msw";
import { z } from "zod";
import {
  ProductListResponseSchema,
  ProductResponseSchema,
  SaleSchema,
  StockListResponseSchema,
  StockMovementSchema,
  StockResponseSchema,
  type Sale,
  type StockMovement,
} from "@kwinna/contracts";
import { products, sales, stock, stockMovements } from "./db";

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

  // GET /stock/:productId
  http.get(`${BASE}/stock/:productId`, ({ params }) => {
    const entry = stock.find((s) => s.productId === params["productId"]);
    if (!entry) return notFound("Stock entry not found");
    const parsed = StockResponseSchema.parse({ data: entry });
    return HttpResponse.json(parsed);
  }),

  // POST /stock/in — incrementa stock
  http.post(`${BASE}/stock/in`, async ({ request }) => {
    const body = await request.json();

    const MovementInputSchema = StockMovementSchema.pick({
      productId: true,
      quantity: true,
      reason: true,
    });

    const result = MovementInputSchema.safeParse(body);
    if (!result.success) return validationError(result.error.issues);

    const { productId, quantity, reason } = result.data;

    const product = products.find((p) => p.id === productId);
    if (!product) return notFound("Product not found");

    const entry = stock.find((s) => s.productId === productId);
    if (entry) {
      entry.quantity += quantity;
      entry.updatedAt = now();
    } else {
      stock.push({
        id: uuid(),
        productId,
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

    return HttpResponse.json({ data: movement }, { status: 201 });
  }),

  // POST /sales — registra venta y descuenta stock
  http.post(`${BASE}/sales`, async ({ request }) => {
    const body = await request.json();

    const SaleInputSchema = SaleSchema.pick({ items: true });
    const result = SaleInputSchema.safeParse(body);
    if (!result.success) return validationError(result.error.issues);

    const { items } = result.data;

    // Verificar stock suficiente para todos los items antes de procesar
    for (const item of items) {
      const entry = stock.find((s) => s.productId === item.productId);
      if (!entry || entry.quantity < item.quantity) {
        return HttpResponse.json(
          {
            error: "Insufficient stock",
            productId: item.productId,
            available: entry?.quantity ?? 0,
            requested: item.quantity,
          },
          { status: 409 }
        );
      }
    }

    // Calcular total y descontar stock
    let total = 0;
    for (const item of items) {
      total += item.subtotal;
      const entry = stock.find((s) => s.productId === item.productId);
      if (entry) {
        entry.quantity -= item.quantity;
        entry.updatedAt = now();
      }

      const movement: StockMovement = {
        id: uuid(),
        productId: item.productId,
        type: "out",
        quantity: item.quantity,
        reason: "sale",
        createdAt: now(),
      };
      stockMovements.push(movement);
    }

    const sale: Sale = {
      id: uuid(),
      items,
      total,
      status: "completed",
      createdAt: now(),
      updatedAt: now(),
    };
    sales.push(sale);

    return HttpResponse.json({ data: sale }, { status: 201 });
  }),
];
