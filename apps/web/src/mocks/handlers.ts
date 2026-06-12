import { http, HttpResponse } from "msw";
import {
  AuthSchema,
  ProductBulkInputSchema,
  ProductCreateInputSchema,
  ProductDeleteInputSchema,
  ProductListResponseSchema,
  ProductResponseSchema,
  ProductUpdateInputSchema,
  PromoCodeCreateInputSchema,
  PromoCodeUpdateInputSchema,
  PromoCodeValidateInputSchema,
  RegisterInputSchema,
  SaleListResponseSchema,
  SaleOrderInputSchema,
  SaleResponseSchema,
  ShippingZoneCreateInputSchema,
  ShippingZoneUpdateInputSchema,
  StockListResponseSchema,
  StockMovementSchema,
  type PromoCode,
  type Product,
  type Sale,
  type SaleItem,
  type ShippingZone,
  type StockMovement,
} from "@kwinna/contracts";
import { z } from "zod";
import { products, promoCodes, sales, stock, stockMovements } from "./db";

// ─── Mock users (dev-only, sin bcrypt) ────────────────────────────────────────
// En mock mode las contraseñas se comparan en texto plano por simplicidad.
// En producción el backend usa bcrypt.

interface MockUser {
  id:       string;
  email:    string;
  name:     string;
  role:     "admin" | "operator" | "customer";
  password: string; // plaintext solo en mock
}

const mockUsers: MockUser[] = [
  {
    id:       "880e8400-e29b-41d4-a716-446655440001",
    email:    "jjulieta.c981@gmail.com",
    name:     "Juli",
    role:     "admin",
    password: "dev-admin-pass",   // contraseña solo para entorno de mocks
  },
];

// ─── Mock shipping zones ─────────────────────────────────────────────────────

function normalizeCity(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

let mockShippingZones: ShippingZone[] = [
  { id: "sz-1", city: "neuquen",    displayName: "Neuquén",    cost: 3500, updatedAt: new Date().toISOString() },
  { id: "sz-2", city: "plottier",   displayName: "Plottier",   cost: 3500, updatedAt: new Date().toISOString() },
  { id: "sz-3", city: "cipolletti", displayName: "Cipolletti", cost: 3500, updatedAt: new Date().toISOString() },
  { id: "sz-4", city: "centenario", displayName: "Centenario", cost: 3500, updatedAt: new Date().toISOString() },
];

function mockShippingCost(city: string): number {
  const norm = normalizeCity(city);
  return mockShippingZones.find((z) => z.city === norm)?.cost ?? 0;
}

const BASE = "http://localhost:3001";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

// Espeja la lógica de descuento del backend (sale.service.ts).
// Retorna { transferDiscount, promoDiscount, promoCodeId, total }.
function calcMockTotals(
  itemsTotal:    number,
  shippingCost:  number,
  paymentMethod: string | undefined,
  promoCode:     string | undefined
): { transferDiscount: number; promoDiscount: number; promoCodeId: string | undefined; total: number } {
  const transferDiscount = paymentMethod === "transfer" ? itemsTotal * 0.20 : 0;

  let promoDiscount = 0;
  let promoCodeId: string | undefined;

  if (promoCode) {
    const promo = promoCodes.find((p) => p.code === promoCode.toUpperCase());
    if (promo && promo.isActive) {
      const isTransfer    = paymentMethod === "transfer";
      const discountType  = isTransfer ? promo.transferDiscountType  : promo.cardDiscountType;
      const discountValue = isTransfer ? promo.transferDiscountValue : promo.cardDiscountValue;

      if (discountType && discountValue != null) {
        if (discountType === "percentage") {
          promoDiscount = itemsTotal * (discountValue / 100);
        } else {
          promoDiscount = Math.min(discountValue, itemsTotal - transferDiscount);
        }
        promoCodeId = promo.id;
        promo.usedCount += 1;
      }
    }
  }

  const total = itemsTotal - transferDiscount - promoDiscount + shippingCost;
  return { transferDiscount, promoDiscount, promoCodeId, total };
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
  // POST /auth/login
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json();
    const result = AuthSchema.safeParse(body);
    if (!result.success) return validationError(result.error.issues);

    const { email, password } = result.data;
    const user = mockUsers.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      return HttpResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      user:  { id: user.id, email: user.email, name: user.name, role: user.role },
      token: `mock-jwt-${user.role}-${user.id}`,
    });
  }),

  // POST /auth/register
  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const body = await request.json();
    const result = RegisterInputSchema.safeParse(body);
    if (!result.success) return validationError(result.error.issues);

    const { name, email, password } = result.data;

    if (mockUsers.some((u) => u.email === email)) {
      return HttpResponse.json(
        { error: "Ya existe una cuenta con ese email" },
        { status: 409 }
      );
    }

    const newUser: MockUser = {
      id:       uuid(),
      email,
      name,
      role:     "customer",
      password,
    };
    mockUsers.push(newUser);

    return HttpResponse.json(
      {
        user:  { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
        token: `mock-jwt-customer-${newUser.id}`,
      },
      { status: 201 }
    );
  }),

  // GET /products — supports ?q= text search on name/description
  http.get(`${BASE}/products`, ({ request }) => {
    const url = new URL(request.url);
    const q   = url.searchParams.get("q")?.trim().toLowerCase();

    const filtered = q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.description ?? "").toLowerCase().includes(q),
        )
      : products;

    const parsed = ProductListResponseSchema.parse({ data: filtered });
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
      showInShop:  result.data.showInShop ?? true,
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

  // PATCH /products/:id — actualiza campos presentes en el body
  http.patch(`${BASE}/products/:id`, async ({ request, params }) => {
    const id   = params["id"] as string;
    const body = await request.json();

    const result = ProductUpdateInputSchema.safeParse(body);
    if (!result.success) return validationError(result.error.issues);

    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return notFound("Producto no encontrado");

    const current = products[idx]!;
    const patch   = result.data;

    const updated: Product = {
      ...current,
      name:        patch.name        ?? current.name,
      description: patch.description ?? current.description,
      sku:         patch.sku         ?? current.sku,
      price:       patch.price       ?? current.price,
      categoryId:  patch.categoryId  ?? current.categoryId,
      images:      patch.images      ?? current.images,
      tags:        patch.tags        ?? current.tags,
      updatedAt:   now(),
    };

    products[idx] = updated;

    const parsed = ProductResponseSchema.parse({ data: updated });
    return HttpResponse.json(parsed);
  }),

  // DELETE /products/:id — valida contraseña del admin contra mock users
  http.delete(`${BASE}/products/:id`, async ({ request, params }) => {
    const id   = params["id"] as string;
    const body = await request.json();

    const result = ProductDeleteInputSchema.safeParse(body);
    if (!result.success) return validationError(result.error.issues);

    const productIndex = products.findIndex((p) => p.id === id);
    if (productIndex === -1) return notFound("Producto no encontrado");

    // Mock password check — solo verifica contra el admin (texto plano en mock)
    const { password } = result.data;
    const admin = mockUsers.find((u) => u.role === "admin");
    if (!admin || admin.password !== password) {
      return HttpResponse.json(
        { error: "Contraseña incorrecta" },
        { status: 401 },
      );
    }

    // Eliminar producto, stock y movimientos del mock
    const deletedId = products[productIndex]!.id;
    products.splice(productIndex, 1);

    // Limpiar entradas de stock y movimientos relacionados
    const stockIdx: number[] = [];
    stock.forEach((s, i) => { if (s.productId === deletedId) stockIdx.push(i); });
    for (let i = stockIdx.length - 1; i >= 0; i--) stock.splice(stockIdx[i]!, 1);

    const movIdx: number[] = [];
    stockMovements.forEach((m, i) => { if (m.productId === deletedId) movIdx.push(i); });
    for (let i = movIdx.length - 1; i >= 0; i--) stockMovements.splice(movIdx[i]!, 1);

    return HttpResponse.json({ data: { deleted: true } });
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
            shippingAddress, shippingCity, shippingProvince,
            userId, paymentMethod, promoCode } = result.data;

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
    let itemsTotal = 0;

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        return HttpResponse.json({ error: "Producto no encontrado", productId: item.productId }, { status: 404 });
      }
      const subtotal = product.price * item.quantity;
      itemsTotal += subtotal;
      saleItems.push({ productId: item.productId, quantity: item.quantity,
                       unitPrice: product.price, subtotal, size: item.size });
    }

    const shippingCost = mockShippingCost(shippingCity ?? '');
    const { promoDiscount, promoCodeId, total } = calcMockTotals(itemsTotal, shippingCost, paymentMethod, promoCode);

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
      id: uuid(), items: saleItems, total, status: "completed", channel: "web",
      customerName, customerEmail, customerPhone,
      shippingAddress: shippingAddress ?? '', shippingCity: shippingCity ?? '', shippingProvince: shippingProvince ?? '', shippingZipCode: "", shippingMethod: "delivery" as const, shippingCost, userId,
      isDismissed: false, promoCodeId, promoDiscount,
      createdAt: now(), updatedAt: now(),
    };
    sales.push(sale);

    return HttpResponse.json({ data: sale }, { status: 201 });
  }),

  // POST /products/bulk — importación masiva desde Excel/CSV
  http.post(`${BASE}/products/bulk`, async ({ request }) => {
    const body = await request.json();
    const result = ProductBulkInputSchema.safeParse(body);
    if (!result.success) return validationError(result.error.issues);

    const created: Product[] = [];
    let skipped = 0;

    for (const item of result.data.items) {
      // Skip duplicates by SKU (same as real backend)
      if (products.some((p) => p.sku === item.product.sku)) {
        skipped++;
        continue;
      }

      const product: Product = {
        id:          uuid(),
        name:        item.product.name,
        description: item.product.description,
        sku:         item.product.sku,
        price:       item.product.price,
        categoryId:  item.product.categoryId,
        images:      item.product.images ?? [],
        tags:        item.product.tags ?? [],
        showInShop:  item.product.showInShop ?? true,
        createdAt:   now(),
        updatedAt:   now(),
      };
      products.push(product);

      for (const entry of item.stock) {
        const existing = stock.find(
          (s) => s.productId === product.id && s.size === entry.size
        );
        if (existing) {
          existing.quantity += entry.quantity;
          existing.updatedAt = now();
        } else {
          stock.push({
            id:        uuid(),
            productId: product.id,
            size:      entry.size,
            quantity:  entry.quantity,
            updatedAt: now(),
          });
        }
        stockMovements.push({
          id:        uuid(),
          productId: product.id,
          type:      "in",
          quantity:  entry.quantity,
          reason:    "bulk_import",
          createdAt: now(),
        });
      }

      created.push(product);
    }

    return HttpResponse.json(
      { data: { created: created.length, skipped, products: created } },
      { status: 201 },
    );
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

  // PATCH /sales/:id/status — actualiza el status de una venta
  http.patch(`${BASE}/sales/:id/status`, async ({ params, request }) => {
    const { id } = params as { id: string };
    const body = await request.json() as { status?: string };
    const sale = sales.find((s) => s.id === id);
    if (!sale) return HttpResponse.json({ error: "Sale not found" }, { status: 404 });
    if (!body.status) return HttpResponse.json({ error: "Status required" }, { status: 400 });

    sale.status = body.status as Sale["status"];
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
            shippingAddress, shippingCity, shippingProvince,
            userId, paymentMethod, promoCode } = result.data;

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
    let itemsTotal = 0;

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        return HttpResponse.json({ error: "Producto no encontrado", productId: item.productId }, { status: 404 });
      }
      const subtotal = product.price * item.quantity;
      itemsTotal += subtotal;
      saleItems.push({ productId: item.productId, quantity: item.quantity,
                       unitPrice: product.price, subtotal, size: item.size });
    }

    const shippingCost = mockShippingCost(shippingCity ?? '');
    const { promoDiscount, promoCodeId, total } = calcMockTotals(itemsTotal, shippingCost, paymentMethod, promoCode);

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
      status: "pending", channel: "web",
      customerName, customerEmail, customerPhone,
      shippingAddress: shippingAddress ?? '', shippingCity: shippingCity ?? '', shippingProvince: shippingProvince ?? '', shippingZipCode: "", shippingMethod: "delivery" as const, shippingCost, userId,
      isDismissed: false, promoCodeId, promoDiscount,
      createdAt: now(), updatedAt: now(),
    };
    sales.push(sale);

    const initPoint = `http://localhost:3000/checkout/success`;
    return HttpResponse.json({ data: { sale, initPoint } }, { status: 201 });
  }),
  // GET /promo-codes — admin
  http.get(`${BASE}/promo-codes`, () => {
    return HttpResponse.json({ data: promoCodes });
  }),

  // POST /promo-codes/validate — public
  http.post(`${BASE}/promo-codes/validate`, async ({ request }) => {
    const body = await request.json();
    const result = PromoCodeValidateInputSchema.safeParse(body);
    if (!result.success) return validationError(result.error.issues);
    const { code, paymentMethod } = result.data;

    const promo = promoCodes.find((p) => p.code === code.toUpperCase());
    if (!promo)        return HttpResponse.json({ valid: false, errorMessage: "Código inválido" });
    if (!promo.isActive) return HttpResponse.json({ valid: false, errorMessage: "Código inactivo" });
    const nowIso = new Date().toISOString();
    if (promo.validFrom  && promo.validFrom  > nowIso) return HttpResponse.json({ valid: false, errorMessage: "Código aún no vigente" });
    if (promo.validUntil && promo.validUntil < nowIso) return HttpResponse.json({ valid: false, errorMessage: "Código vencido" });
    if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return HttpResponse.json({ valid: false, errorMessage: "Código agotado" });

    const isTransfer    = paymentMethod === "transfer";
    const discountType  = isTransfer ? promo.transferDiscountType  : promo.cardDiscountType;
    const discountValue = isTransfer ? promo.transferDiscountValue : promo.cardDiscountValue;
    if (!discountType || discountValue == null) {
      return HttpResponse.json({ valid: false, errorMessage: `Este código no aplica para ${isTransfer ? "transferencia" : "tarjeta"}` });
    }
    const discountLabel = discountType === "percentage"
      ? `${discountValue}% de descuento adicional`
      : `$${discountValue.toLocaleString("es-AR")} de descuento`;
    return HttpResponse.json({ valid: true, discountType, discountValue, discountLabel });
  }),

  // POST /promo-codes — admin
  http.post(`${BASE}/promo-codes`, async ({ request }) => {
    const body = await request.json();
    const result = PromoCodeCreateInputSchema.safeParse(body);
    if (!result.success) return validationError(result.error.issues);
    const input = result.data;
    if (promoCodes.some((p) => p.code === input.code.toUpperCase())) {
      return HttpResponse.json({ error: "Ya existe un código con ese nombre" }, { status: 409 });
    }
    const promo: PromoCode = {
      id:                    uuid(),
      code:                  input.code.toUpperCase(),
      description:           input.description ?? null,
      transferDiscountType:  input.transferDiscountType  ?? null,
      transferDiscountValue: input.transferDiscountValue ?? null,
      cardDiscountType:      input.cardDiscountType      ?? null,
      cardDiscountValue:     input.cardDiscountValue     ?? null,
      isActive:              input.isActive ?? true,
      validFrom:             input.validFrom  ?? null,
      validUntil:            input.validUntil ?? null,
      maxUses:               input.maxUses    ?? null,
      usedCount:             0,
      createdAt:             now(),
      updatedAt:             now(),
    };
    promoCodes.push(promo);
    return HttpResponse.json({ data: promo }, { status: 201 });
  }),

  // PATCH /promo-codes/:id — admin
  http.patch(`${BASE}/promo-codes/:id`, async ({ params, request }) => {
    const { id } = params as { id: string };
    const idx = promoCodes.findIndex((p) => p.id === id);
    if (idx === -1) return notFound("Código promocional no encontrado");
    const body = await request.json();
    const result = PromoCodeUpdateInputSchema.safeParse(body);
    if (!result.success) return validationError(result.error.issues);
    const patch = result.data;
    const p = promoCodes[idx]!;
    if (patch.code               !== undefined) p.code                  = patch.code.toUpperCase();
    if (patch.description        !== undefined) p.description           = patch.description        ?? null;
    if (patch.isActive           !== undefined) p.isActive              = patch.isActive;
    if (patch.maxUses            !== undefined) p.maxUses               = patch.maxUses            ?? null;
    if (patch.validFrom          !== undefined) p.validFrom             = patch.validFrom          ?? null;
    if (patch.validUntil         !== undefined) p.validUntil            = patch.validUntil         ?? null;
    if (patch.transferDiscountType  !== undefined) p.transferDiscountType  = patch.transferDiscountType  ?? null;
    if (patch.transferDiscountValue !== undefined) p.transferDiscountValue = patch.transferDiscountValue ?? null;
    if (patch.cardDiscountType      !== undefined) p.cardDiscountType      = patch.cardDiscountType      ?? null;
    if (patch.cardDiscountValue     !== undefined) p.cardDiscountValue     = patch.cardDiscountValue     ?? null;
    p.updatedAt = now();
    return HttpResponse.json({ data: p });
  }),

  // DELETE /promo-codes/:id — admin
  http.delete(`${BASE}/promo-codes/:id`, ({ params }) => {
    const { id } = params as { id: string };
    const idx = promoCodes.findIndex((p) => p.id === id);
    if (idx === -1) return notFound("Código promocional no encontrado");
    promoCodes.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /shipping/zones — public
  http.get(`${BASE}/shipping/zones`, () => {
    return HttpResponse.json({ data: mockShippingZones });
  }),

  // POST /shipping/zones — admin
  http.post(`${BASE}/shipping/zones`, async ({ request }) => {
    const body = await request.json();
    const result = ShippingZoneCreateInputSchema.safeParse(body);
    if (!result.success) return validationError(result.error.issues);
    const { displayName, cost } = result.data;
    const city = normalizeCity(displayName);
    if (mockShippingZones.some((z) => z.city === city)) {
      return HttpResponse.json({ error: `Ya existe una zona para "${displayName}"` }, { status: 409 });
    }
    const zone: ShippingZone = { id: uuid(), city, displayName: displayName.trim(), cost, updatedAt: now() };
    mockShippingZones.push(zone);
    return HttpResponse.json({ data: zone }, { status: 201 });
  }),

  // PATCH /shipping/zones/:id — admin
  http.patch(`${BASE}/shipping/zones/:id`, async ({ params, request }) => {
    const { id } = params as { id: string };
    const idx = mockShippingZones.findIndex((z) => z.id === id);
    if (idx === -1) return notFound("Zona no encontrada");
    const body = await request.json();
    const result = ShippingZoneUpdateInputSchema.safeParse(body);
    if (!result.success) return validationError(result.error.issues);
    const { displayName, cost } = result.data;
    if (displayName !== undefined) {
      mockShippingZones[idx].city = normalizeCity(displayName);
      mockShippingZones[idx].displayName = displayName.trim();
    }
    if (cost !== undefined) mockShippingZones[idx].cost = cost;
    mockShippingZones[idx].updatedAt = now();
    return HttpResponse.json({ data: mockShippingZones[idx] });
  }),

  // DELETE /shipping/zones/:id — admin
  http.delete(`${BASE}/shipping/zones/:id`, ({ params }) => {
    const { id } = params as { id: string };
    const idx = mockShippingZones.findIndex((z) => z.id === id);
    if (idx === -1) return notFound("Zona no encontrada");
    mockShippingZones.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
