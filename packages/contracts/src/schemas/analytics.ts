import { z } from "zod";

// ─── Analytics ────────────────────────────────────────────────────────────────
// Embudo web: shop_view → cart_add → checkout_start.
// Nota: el enum de la BD (analytics_event_type) además conserva el valor histórico
// 'sale_complete', pero la app ya no lo emite ni lo cuenta — las compras del embudo
// se cuentan desde la tabla de ventas (webOrders / isPaidSale).

export const AnalyticsEventTypeSchema = z.enum([
  "shop_view",
  "cart_add",
  "checkout_start",
]);
export type AnalyticsEventType = z.infer<typeof AnalyticsEventTypeSchema>;

// Resumen del embudo: sesiones únicas por etapa en un rango de fechas.
export const AnalyticsSummarySchema = z.object({
  shopViews:      z.number().int().nonnegative(),
  cartAdds:       z.number().int().nonnegative(),
  checkoutStarts: z.number().int().nonnegative(),
});
export type AnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>;
