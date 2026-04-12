import { randomUUID } from "node:crypto";
import type { Stock, StockMovement } from "@kwinna/contracts";
import { stock, stockMovements } from "../db/seed";

function now(): string {
  return new Date().toISOString();
}

export function getAllStock(): Stock[] {
  return stock;
}

export function getStockByProductId(productId: string): Stock | undefined {
  return stock.find((s) => s.productId === productId);
}

export interface StockInInput {
  productId: string;
  quantity: number;
  reason?: string;
}

export function addStock(input: StockInInput): StockMovement {
  const entry = stock.find((s) => s.productId === input.productId);

  if (entry) {
    entry.quantity += input.quantity;
    entry.updatedAt = now();
  } else {
    stock.push({
      id: randomUUID(),
      productId: input.productId,
      quantity: input.quantity,
      updatedAt: now(),
    });
  }

  const movement: StockMovement = {
    id: randomUUID(),
    productId: input.productId,
    type: "in",
    quantity: input.quantity,
    reason: input.reason,
    createdAt: now(),
  };

  stockMovements.push(movement);
  return movement;
}

export function checkStockAvailability(productId: string, quantity: number): void {
  const entry = stock.find((s) => s.productId === productId);
  if (!entry || entry.quantity < quantity) {
    const available = entry?.quantity ?? 0;
    const err = new Error(
      `Insufficient stock for product ${productId}: requested ${quantity}, available ${available}`
    );
    (err as Error & { statusCode: number }).statusCode = 409;
    throw err;
  }
}

export interface DeductStockInput {
  productId: string;
  quantity: number;
}

/**
 * Descuenta stock para un item de venta.
 * Lanza un Error si no hay stock suficiente — el service de Sale lo captura
 * antes de comprometer cualquier cambio.
 */
export function deductStock(input: DeductStockInput): void {
  const entry = stock.find((s) => s.productId === input.productId);

  if (!entry || entry.quantity < input.quantity) {
    const available = entry?.quantity ?? 0;
    const err = new Error(
      `Insufficient stock for product ${input.productId}: requested ${input.quantity}, available ${available}`
    );
    (err as Error & { statusCode: number }).statusCode = 409;
    throw err;
  }

  // Prepara el movimiento ANTES de mutar el estado para garantizar atomicidad:
  // si randomUUID() o la construcción del objeto fallan, el stock no se toca.
  const movement: StockMovement = {
    id: randomUUID(),
    productId: input.productId,
    type: "out",
    quantity: input.quantity,
    reason: "sale",
    createdAt: now(),
  };

  entry.quantity -= input.quantity;
  entry.updatedAt = now();
  stockMovements.push(movement);
}
