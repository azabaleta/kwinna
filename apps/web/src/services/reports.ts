import type {
  GenerateSnapshotInput,
  MetricSnapshot,
  MetricSnapshotListResponse,
  MetricSnapshotResponse,
} from "@kwinna/contracts";
import apiClient from "@/lib/axios";
import { type AxiosError } from "axios";

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchSnapshots(): Promise<MetricSnapshot[]> {
  const res = await apiClient.get<MetricSnapshotListResponse>("/reports/snapshots");
  return res.data.data;
}

export async function fetchSnapshot(id: string): Promise<MetricSnapshot> {
  const res = await apiClient.get<MetricSnapshotResponse>(`/reports/snapshots/${id}`);
  return res.data.data;
}

// ─── Generate ─────────────────────────────────────────────────────────────────

export async function generateSnapshot(input: GenerateSnapshotInput): Promise<MetricSnapshot> {
  try {
    const res = await apiClient.post<MetricSnapshotResponse>("/reports/snapshots", input);
    return res.data.data;
  } catch (err) {
    const msg = (err as AxiosError<{ error?: string }>).response?.data?.error;
    throw new Error(msg ?? "Error al generar el reporte");
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteSnapshot(id: string): Promise<void> {
  await apiClient.delete(`/reports/snapshots/${id}`);
}

// ─── Export to Drive ──────────────────────────────────────────────────────────

export interface DriveExportResult {
  fileId:      string;
  webViewLink: string;
}

export async function exportSnapshotToDrive(id: string): Promise<DriveExportResult> {
  try {
    const res = await apiClient.post<{ data: DriveExportResult }>(
      `/reports/snapshots/${id}/export-drive`
    );
    return res.data.data;
  } catch (err) {
    const msg = (err as AxiosError<{ error?: string }>).response?.data?.error;
    throw new Error(msg ?? "Error al exportar a Drive");
  }
}

// ─── CSV export ───────────────────────────────────────────────────────────────
// Convierte un snapshot en un CSV descargable sin dependencias externas.

export function snapshotToCsv(snapshot: MetricSnapshot): string {
  const { data: d, label, dateFrom, dateTo } = snapshot;

  const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
  const pct  = (n: number) => `${n.toFixed(1)}%`;
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const rows: string[][] = [
    ["Reporte Kwinna", label],
    ["Período", `${date(dateFrom)} – ${date(dateTo)}`],
    ["Generado el", date(snapshot.createdAt)],
    [],
    ["── VENTAS ──"],
    ["Total ventas",          String(d.sales.count)],
    ["  Web",                 String(d.sales.countWeb)],
    ["  POS (mostrador)",     String(d.sales.countPos)],
    ["Ingresos totales",      fmt(d.sales.revenue)],
    ["  Ingresos web",        fmt(d.sales.revenueWeb)],
    ["  Ingresos POS",        fmt(d.sales.revenuePos)],
    ["Ingresos por envío",    fmt(d.sales.shippingRevenue)],
    ["Ticket promedio",       fmt(d.sales.avgOrderValue)],
    [],
    ["Top productos (unidades vendidas)"],
    ["Producto", "Unidades", "Ingresos"],
    ...d.sales.topProducts.map((p) => [p.name, String(p.units), fmt(p.revenue)]),
    [],
    ["── DEVOLUCIONES ──"],
    ["Total devoluciones",    String(d.returns.count)],
    ["Unidades no recuperadas", String(d.returns.lostQuantity)],
    ["Pérdida económica",     fmt(d.returns.lostValue)],
    ["Por motivo"],
    ["  Calidad",             String(d.returns.byReason["quality"] ?? 0)],
    ["  Detalle",             String(d.returns.byReason["detail"] ?? 0)],
    ["  Color",               String(d.returns.byReason["color"] ?? 0)],
    ["  Talle",               String(d.returns.byReason["size"] ?? 0)],
    ["  No era lo esperado",  String(d.returns.byReason["not_as_expected"] ?? 0)],
    [],
    ["── CONVERSIÓN (WEB) ──"],
    ["Vistas de tienda",      String(d.conversion.shopViews)],
    ["Agregados al carrito",  String(d.conversion.cartAdds)],
    ["Inicios de checkout",   String(d.conversion.checkoutStarts)],
    ["Ventas completadas",    String(d.conversion.salesCompleted)],
    ["Tasa de conversión",    pct(d.conversion.conversionRate)],
    ["Abandono de carrito",   pct(d.conversion.cartAbandonmentRate)],
    [],
    ["── STOCK CRÍTICO (< 3 unidades al momento del reporte) ──"],
    ["Producto", "Talle", "Stock"],
    ...d.stock.criticalItems.map((i) => [i.name, i.size ?? "—", String(i.quantity)]),
  ];

  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
}

export function downloadCsv(content: string, filename: string): void {
  const bom  = "\uFEFF"; // UTF-8 BOM — para que Excel lo abra correctamente
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
