import { randomUUID } from "node:crypto";
import type { Sale, SaleItem } from "@kwinna/contracts";
import { sales } from "../db/seed";
import { checkStockAvailability, deductStock } from "./stock.service";

function now(): string {
  return new Date().toISOString();
}

export interface CreateSaleInput {
  items: SaleItem[];
}

/**
 * Crea una venta. Garantiza atomicidad sobre el estado en memoria:
 * valida disponibilidad de stock en todos los items ANTES de descontar ninguno.
 * Si cualquier item falla, se lanza el error sin modificar el estado.
 */
export function createSale(input: CreateSaleInput): Sale {
  // Pre-flight: verifica todos los items antes de tocar el estado
  for (const item of input.items) {
    checkStockAvailability(item.productId, item.quantity);
  }

  // Commit: descuenta stock y registra movimientos
  for (const item of input.items) {
    deductStock({ productId: item.productId, quantity: item.quantity });
  }

  const total = input.items.reduce((sum, item) => sum + item.subtotal, 0);

  const sale: Sale = {
    id: randomUUID(),
    items: input.items,
    total,
    status: "completed",
    createdAt: now(),
    updatedAt: now(),
  };

  sales.push(sale);
  return sale;
}
