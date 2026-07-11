// ─── Meta Pixel (navegador) ─────────────────────────────────────────────────
// Wrapper fino sobre `window.fbq`. Todo es no-op si el Píxel no está configurado
// (falta NEXT_PUBLIC_META_PIXEL_ID) o si corremos en el servidor (SSR).
//
// Convive con el analytics propio (`services/analytics.ts`) — no lo reemplaza.
// El Purchase server-side (CAPI) deduplica contra estos eventos por `eventID`.

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

/** true si hay un Pixel ID configurado. */
export const isPixelEnabled = META_PIXEL_ID.length > 0;

// `fbq` que inyecta el snippet base en window. Tipado laxo pero sin `any`.
type Fbq = (
  method: string,
  eventName: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string },
) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

/**
 * Dispara un evento estándar del Píxel. Fire-and-forget — nunca lanza ni bloquea.
 * SSR-safe: sin `window` o sin `fbq` cargado, no hace nada.
 *
 * @param eventName Evento estándar de Meta (ViewContent, AddToCart, ...).
 * @param params    Parámetros del evento (content_ids, value, currency, ...).
 * @param eventId   ID determinístico para deduplicar con el CAPI (ej. Purchase).
 */
export function metaTrack(
  eventName: string,
  params?: Record<string, unknown>,
  eventId?: string,
): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    if (eventId) {
      window.fbq("track", eventName, params ?? {}, { eventID: eventId });
    } else {
      window.fbq("track", eventName, params ?? {});
    }
  } catch {
    /* silencioso — el tracking nunca debe romper el flujo */
  }
}
