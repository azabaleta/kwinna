import { and, gte, lt } from "drizzle-orm";
import type { AnalyticsEventType, AnalyticsSummary } from "@kwinna/contracts";
import { db } from "../index";
import { analyticsEventsTable } from "../schema";

// ─── Insert ───────────────────────────────────────────────────────────────────

export async function insertAnalyticsEvent(
  eventType: AnalyticsEventType,
  sessionId: string,
  userId?:   string,
): Promise<void> {
  await db.insert(analyticsEventsTable).values({ eventType, sessionId, userId });
}

// ─── Summary ─────────────────────────────────────────────────────────────────
// Cuenta sesiones únicas por tipo de evento en un rango de fechas.
// "Sesión única" = sessionId distinto, evita inflar métricas por recargas.

export async function getAnalyticsSummary(
  from: Date,
  to:   Date,
): Promise<AnalyticsSummary> {
  const rows = await db
    .select()
    .from(analyticsEventsTable)
    .where(
      and(
        gte(analyticsEventsTable.createdAt, from),
        lt(analyticsEventsTable.createdAt, to),
      ),
    );

  const unique = (type: AnalyticsEventType) =>
    new Set(rows.filter((r) => r.eventType === type).map((r) => r.sessionId)).size;

  return {
    shopViews:      unique("shop_view"),
    cartAdds:       unique("cart_add"),
    checkoutStarts: unique("checkout_start"),
  };
}
