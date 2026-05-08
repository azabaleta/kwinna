import { and, gte, lt } from "drizzle-orm";
import type { MetricSnapshot, SnapshotData, SnapshotPeriod } from "@kwinna/contracts";
import { db } from "../db";
import { salesTable } from "../db/schema";
import { getAnalyticsSummary } from "../db/repositories/analytics.repository";
import { findAllProducts } from "../db/repositories/product.repository";
import { insertSnapshot, findAllSnapshots, findSnapshotById, deleteSnapshot } from "../db/repositories/reports.repository";
import { findReturnsByDateRange } from "../db/repositories/returns.repository";
import { findAllStock } from "../db/repositories/stock.repository";
import { mapSaleRow } from "../db/repositories/sale.repository";

const CRITICAL_STOCK_THRESHOLD = 3;
const TOP_PRODUCTS_COUNT       = 5;
const CRITICAL_ITEMS_MAX       = 20;

// ─── Compute ──────────────────────────────────────────────────────────────────

async function computeSnapshotData(from: Date, to: Date): Promise<SnapshotData> {

  // ── 1. Fetch all data sources in parallel ─────────────────────────────────
  const [salesRows, returns, analytics, allStock, products] = await Promise.all([
    db
      .select()
      .from(salesTable)
      .where(and(gte(salesTable.createdAt, from), lt(salesTable.createdAt, to))),
    findReturnsByDateRange(from, to),
    getAnalyticsSummary(from, to),
    findAllStock(),
    findAllProducts(),
  ]);

  const sales = salesRows.map(mapSaleRow).filter(s => s.status === "completed");

  // ── 2. Product lookup map (id → name) ─────────────────────────────────────
  const productName = new Map(products.map((p) => [p.id, p.name]));

  // ── 3. Sales metrics ──────────────────────────────────────────────────────
  const webSales = sales.filter((s) => s.channel === "web");
  const posSales = sales.filter((s) => s.channel === "pos");

  // Excluir ventas "por_devolucion" de ingresos: no generan ingreso real
  const revSales       = sales.filter((s) => s.paymentMethod !== "por_devolucion");
  const revWebSales    = webSales.filter((s) => s.paymentMethod !== "por_devolucion");
  const revPosSales    = posSales.filter((s) => s.paymentMethod !== "por_devolucion");

  const revenue           = revSales.reduce((s, v) => s + v.total, 0);
  const revenueWeb        = revWebSales.reduce((s, v) => s + v.total, 0);
  const revenuePos        = revPosSales.reduce((s, v) => s + v.total, 0);
  const shippingRev       = revSales.reduce((s, v) => s + v.shippingCost, 0);
  const avgOrderValue     = revSales.length    > 0 ? revenue    / revSales.length    : 0;
  const avgOrderValueWeb  = revWebSales.length > 0 ? revenueWeb / revWebSales.length : 0;
  const avgOrderValuePos  = revPosSales.length > 0 ? revenuePos / revPosSales.length : 0;

  // Aggregate units + revenue per product from JSONB items
  const unitsByProduct    = new Map<string, number>();
  const revenueByProduct  = new Map<string, number>();
  for (const sale of sales) {
    for (const item of sale.items) {
      unitsByProduct.set(item.productId, (unitsByProduct.get(item.productId) ?? 0) + item.quantity);
      revenueByProduct.set(item.productId, (revenueByProduct.get(item.productId) ?? 0) + item.subtotal);
    }
  }
  const topProducts = [...unitsByProduct.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_PRODUCTS_COUNT)
    .map(([productId, units]) => ({
      productId,
      name:    productName.get(productId) ?? productId.slice(0, 8) + "…",
      units,
      revenue: revenueByProduct.get(productId) ?? 0,
    }));

  // ── 4. Returns metrics ────────────────────────────────────────────────────
  const lost = returns.filter((r) => !r.restocked);
  const byReason = {
    quality:         0,
    detail:          0,
    color:           0,
    size:            0,
    not_as_expected: 0,
  } as Record<string, number>;
  for (const r of returns) {
    byReason[r.reason] = (byReason[r.reason] ?? 0) + r.quantity;
  }

  // ── 5. Conversion metrics ─────────────────────────────────────────────────
  // salesCompleted usa webSales (DB confirmada), no el evento de analytics,
  // que puede duplicarse o perderse. Es la misma fuente que sales.countWeb.
  const { shopViews, cartAdds, checkoutStarts } = analytics;

  const conversionRate      = checkoutStarts > 0
    ? Math.round((webSales.length / checkoutStarts) * 1000) / 10
    : 0;
  const cartAbandonmentRate = cartAdds > 0
    ? Math.round(((cartAdds - checkoutStarts) / cartAdds) * 1000) / 10
    : 0;

  // ── 6. Stock crítico (snapshot del estado actual) ─────────────────────────
  const criticalItems = allStock
    .filter((s) => s.quantity < CRITICAL_STOCK_THRESHOLD)
    .map((s) => ({
      productId: s.productId,
      name:      productName.get(s.productId) ?? s.productId.slice(0, 8) + "…",
      size:      s.size,
      quantity:  s.quantity,
    }))
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, CRITICAL_ITEMS_MAX);

  return {
    sales: {
      count:          sales.length,
      countWeb:       webSales.length,
      countPos:       posSales.length,
      revenue:        Math.round(revenue * 100) / 100,
      revenueWeb:     Math.round(revenueWeb * 100) / 100,
      revenuePos:     Math.round(revenuePos * 100) / 100,
      shippingRevenue: Math.round(shippingRev * 100) / 100,
      avgOrderValue:     Math.round(avgOrderValue    * 100) / 100,
      avgOrderValueWeb:  Math.round(avgOrderValueWeb * 100) / 100,
      avgOrderValuePos:  Math.round(avgOrderValuePos * 100) / 100,
      topProducts,
    },
    returns: {
      count:        returns.length,
      lostQuantity: lost.reduce((s, r) => s + r.quantity, 0),
      lostValue:    Math.round(lost.reduce((s, r) => s + r.quantity * r.unitPrice, 0) * 100) / 100,
      byReason,
    },
    conversion: {
      shopViews,
      cartAdds,
      checkoutStarts,
      salesCompleted: webSales.length,
      conversionRate,
      cartAbandonmentRate,
    },
    stock: { criticalItems },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateSnapshot(input: {
  period:   SnapshotPeriod;
  label:    string;
  dateFrom: string;
  dateTo:   string;
}): Promise<MetricSnapshot> {
  const from = new Date(input.dateFrom);
  const to   = new Date(input.dateTo);

  const data = await computeSnapshotData(from, to);

  return insertSnapshot({
    period:   input.period,
    label:    input.label,
    dateFrom: from,
    dateTo:   to,
    data,
  });
}

export { findAllSnapshots, findSnapshotById, deleteSnapshot };
