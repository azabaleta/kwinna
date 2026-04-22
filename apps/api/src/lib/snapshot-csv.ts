import type { MetricSnapshot } from "@kwinna/contracts";

const RETURN_REASON_LABELS: Record<string, string> = {
  quality:         "Calidad",
  detail:          "Detalle",
  color:           "Color",
  size:            "Talle",
  not_as_expected: "No era lo esperado",
};

function fmt(n: number): string {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function row(...cells: string[]): string {
  return cells.map((c) => `"${c.replace(/"/g, '""')}"`).join(",");
}

export function buildSnapshotCsv(s: MetricSnapshot): string {
  const { data: d, label, dateFrom, dateTo } = s;

  const lines: string[] = [
    row("Reporte Kwinna", label),
    row("Período", `${fmtDate(dateFrom)} – ${fmtDate(dateTo)}`),
    row("Generado el", fmtDate(s.createdAt)),
    "",
    row("── VENTAS ──"),
    row("Total ventas",       String(d.sales.count)),
    row("  Web",              String(d.sales.countWeb)),
    row("  POS (mostrador)",  String(d.sales.countPos)),
    row("Ingresos totales",   fmt(d.sales.revenue)),
    row("  Ingresos web",     fmt(d.sales.revenueWeb)),
    row("  Ingresos POS",     fmt(d.sales.revenuePos)),
    row("Ingresos por envío", fmt(d.sales.shippingRevenue)),
    row("Ticket promedio",    fmt(d.sales.avgOrderValue)),
    "",
    row("Top productos (unidades vendidas)"),
    row("Producto", "Unidades", "Ingresos"),
    ...d.sales.topProducts.map((p) => row(p.name, String(p.units), fmt(p.revenue))),
    "",
    row("── DEVOLUCIONES ──"),
    row("Total devoluciones",      String(d.returns.count)),
    row("Uds. no recuperadas",     String(d.returns.lostQuantity)),
    row("Pérdida económica",       fmt(d.returns.lostValue)),
    row("Por motivo"),
    ...Object.entries(d.returns.byReason).map(
      ([reason, count]) => row(`  ${RETURN_REASON_LABELS[reason] ?? reason}`, String(count))
    ),
    "",
    row("── CONVERSIÓN (WEB) ──"),
    row("Vistas de tienda",     String(d.conversion.shopViews)),
    row("Adds al carrito",      String(d.conversion.cartAdds)),
    row("Inicios de checkout",  String(d.conversion.checkoutStarts)),
    row("Ventas completadas",   String(d.conversion.salesCompleted)),
    row("Tasa de conversión",   pct(d.conversion.conversionRate)),
    row("Abandono de carrito",  pct(d.conversion.cartAbandonmentRate)),
    "",
    row("── STOCK CRÍTICO (al momento del reporte) ──"),
    row("Producto", "Talle", "Stock"),
    ...d.stock.criticalItems.map((i) =>
      row(i.name, i.size ?? "—", i.quantity === 0 ? "Sin stock" : String(i.quantity))
    ),
  ];

  return lines.join("\r\n");
}

export function snapshotFilename(s: MetricSnapshot): string {
  const slug = s.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
  return `kwinna_reporte_${slug}.csv`;
}
