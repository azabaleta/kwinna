import apiClient from "@/lib/axios";
import { getSessionId } from "@/lib/session";
import { useAuthStore } from "@/store/use-auth-store";

// ─── Event types (espejo del enum backend) ────────────────────────────────────

export type AnalyticsEventType =
  | "shop_view"
  | "cart_add"
  | "checkout_start"
  | "sale_complete";

// ─── Track ────────────────────────────────────────────────────────────────────

/**
 * Registra un evento de analítica. Fire-and-forget — nunca lanza ni bloquea.
 * SSR-safe: si sessionId está vacío (servidor) no hace nada.
 */
export function trackEvent(eventType: AnalyticsEventType): void {
  const sessionId = getSessionId();
  if (!sessionId) return;

  const userId = useAuthStore.getState().user?.id;

  apiClient
    .post("/analytics/event", { eventType, sessionId, userId })
    .catch(() => { /* silencioso */ });
}

// ─── Summary (dashboard) ──────────────────────────────────────────────────────

export interface AnalyticsSummary {
  shopViews:      number;
  cartAdds:       number;
  checkoutStarts: number;
  saleCompletes:  number;
}

export async function fetchAnalyticsSummary(
  from: Date,
  to:   Date,
): Promise<AnalyticsSummary> {
  const res = await apiClient.get("/analytics/summary", {
    params: {
      from: from.toISOString(),
      to:   to.toISOString(),
    },
  });
  return res.data.data as AnalyticsSummary;
}
