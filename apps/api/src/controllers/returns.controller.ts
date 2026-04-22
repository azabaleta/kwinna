import type { Request, Response } from "express";
import { ReturnCreateInputSchema, type ReturnReason } from "@kwinna/contracts";
import {
  findAllReturns,
  findProductById,
  findReturnsByDateRange,
  insertReturn,
  addStock,
} from "../db/repositories";
import { findSaleById } from "../db/repositories/sale.repository";

const RETURN_WINDOW_DAYS = 30;

// ─── GET /returns ─────────────────────────────────────────────────────────────

export async function getReturns(_req: Request, res: Response): Promise<void> {
  const data = await findAllReturns();
  res.json({ data });
}

// ─── POST /returns ────────────────────────────────────────────────────────────
// Si input.restock === true:
//   1. Crea el registro de devolución con restocked=true y el precio del producto
//   2. Llama a addStock para devolver las unidades al inventario
// Si input.restock === false:
//   1. Crea el registro con restocked=false (pérdida de mercadería)
//   El stock NO se toca — la prenda no puede volver a venderse.

export async function postReturn(req: Request, res: Response): Promise<void> {
  const input = ReturnCreateInputSchema.parse(req.body);

  // ── Validación de ventana de cambio ──────────────────────────────────────────
  // Si se provee el ID de transacción, verificamos que la venta no supere los
  // RETURN_WINDOW_DAYS días. Si venció, rechazamos antes de tocar el stock.
  if (input.saleId) {
    const sale = await findSaleById(input.saleId);
    if (sale) {
      const saleDate   = new Date(sale.createdAt);
      const diffMs     = Date.now() - saleDate.getTime();
      const diffDays   = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > RETURN_WINDOW_DAYS) {
        res.status(422).json({ error: "tiempo de cambio expirado" });
        return;
      }
    }
  }

  // Obtener precio actual del producto para registrar el valor histórico
  const product  = await findProductById(input.productId);
  const unitPrice = product ? product.price : 0;

  const data = await insertReturn({
    saleId:    input.saleId,
    productId: input.productId,
    size:      input.size,
    quantity:  input.quantity,
    reason:    input.reason,
    notes:     input.notes,
    restocked: input.restock,
    unitPrice,
  });

  // Reposición de stock solo si la prenda está en condiciones de venta
  if (input.restock) {
    await addStock({
      productId: input.productId,
      quantity:  input.quantity,
      size:      input.size,
      reason:    "Devolución de cliente",
    });
  }

  res.status(201).json({ data });
}

// ─── GET /returns/summary ─────────────────────────────────────────────────────
// Devuelve métricas del período: total, pérdidas (cantidad + valor), by reason.

export async function getReturnsSummary(req: Request, res: Response): Promise<void> {
  const { from, to } = req.query as { from?: string; to?: string };

  const fromDate = from ? new Date(from) : new Date(0);
  const toDate   = to   ? new Date(to)   : new Date();

  const returns = await findReturnsByDateRange(fromDate, toDate);

  const sum = (reason: ReturnReason) =>
    returns
      .filter((r) => r.reason === reason)
      .reduce((acc, r) => acc + r.quantity, 0);

  const lost = returns.filter((r) => !r.restocked);

  const total        = returns.reduce((acc, r) => acc + r.quantity, 0);
  const lostQuantity = lost.reduce((acc, r) => acc + r.quantity, 0);
  const lostValue    = lost.reduce((acc, r) => acc + r.quantity * r.unitPrice, 0);

  res.json({
    data: {
      total,
      lostQuantity,
      lostValue,
      byReason: {
        quality:         sum("quality"),
        detail:          sum("detail"),
        color:           sum("color"),
        size:            sum("size"),
        not_as_expected: sum("not_as_expected"),
      },
    },
  });
}
