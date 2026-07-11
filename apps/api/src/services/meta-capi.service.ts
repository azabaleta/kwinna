import crypto from "node:crypto";
import type { Sale } from "@kwinna/contracts";

// ─── Meta Conversions API (CAPI) ────────────────────────────────────────────────
// Envía el evento `Purchase` server-side a Meta cuando una venta WEB se completa
// (pago aprobado). Complementa al Píxel del navegador: recupera conversiones que
// los ad-blockers / iOS bloquean. Ambos comparten el mismo `event_id`
// (`purchase_<saleId>`) → Meta deduplica y cuenta la compra una sola vez.
//
// Fire-and-forget: NUNCA lanza ni bloquea el flujo de pago. Es no-op si faltan
// las credenciales (META_PIXEL_ID / META_CAPI_ACCESS_TOKEN) o si la venta no es
// del canal web (las ventas POS de mostrador no son atribuibles a anuncios).
//
// Env vars (Railway):
//   META_PIXEL_ID           — id del dataset/píxel (mismo que NEXT_PUBLIC_META_PIXEL_ID)
//   META_CAPI_ACCESS_TOKEN  — token de la API de Conversiones (Events Manager)
//   META_TEST_EVENT_CODE    — opcional, para validar en "Probar eventos"

const GRAPH_API_VERSION = "v21.0";

/** Hash SHA-256 en hex de un dato de usuario ya normalizado. Meta exige PII hasheada. */
function hashData(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Normaliza + hashea un email (lowercase + trim). Devuelve undefined si viene vacío. */
function hashEmail(email?: string): string | undefined {
  const normalized = email?.trim().toLowerCase();
  return normalized ? hashData(normalized) : undefined;
}

/** Normaliza + hashea un teléfono (solo dígitos, sin '+', espacios ni guiones). */
function hashPhone(phone?: string): string | undefined {
  const digits = phone?.replace(/\D/g, "");
  return digits ? hashData(digits) : undefined;
}

/** Normaliza + hashea un nombre suelto (lowercase + trim). */
function hashName(name?: string): string | undefined {
  const normalized = name?.trim().toLowerCase();
  return normalized ? hashData(normalized) : undefined;
}

function getAppUrl(): string {
  return process.env["APP_URL"] ?? "http://localhost:3000";
}

/**
 * Envía el evento `Purchase` de una venta web a la API de Conversiones de Meta.
 * Fire-and-forget: captura y loguea cualquier error, nunca lo propaga.
 */
export async function sendPurchaseEvent(sale: Sale): Promise<void> {
  const pixelId     = process.env["META_PIXEL_ID"];
  const accessToken = process.env["META_CAPI_ACCESS_TOKEN"];

  // No-op si faltan credenciales — permite desplegar el código antes de tener el Píxel.
  if (!pixelId || !accessToken) return;

  // Solo ventas del canal web: las POS no vienen de anuncios y ensuciarían la métrica.
  if (sale.channel !== "web") return;

  try {
    // Meta prefiere el nombre partido en fn/ln. Split simple por espacios.
    const [firstName, ...rest] = sale.customerName.trim().split(/\s+/);
    const lastName = rest.join(" ");

    const userData: Record<string, string> = {};
    const em = hashEmail(sale.customerEmail);
    const ph = hashPhone(sale.customerPhone);
    const fn = hashName(firstName);
    const ln = hashName(lastName);
    if (em) userData["em"] = em;
    if (ph) userData["ph"] = ph;
    if (fn) userData["fn"] = fn;
    if (ln) userData["ln"] = ln;

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name:       "Purchase",
          event_time:       Math.floor(Date.now() / 1000),
          event_id:         `purchase_${sale.id}`,   // dedup con el Píxel del navegador
          action_source:    "website",
          event_source_url: `${getAppUrl()}/checkout/success`,
          user_data:        userData,
          custom_data: {
            currency:     "ARS",
            value:        sale.total,
            content_type: "product",
            contents: sale.items.map((item) => ({
              id:         item.productId,
              quantity:   item.quantity,
              item_price: item.unitPrice,
            })),
          },
        },
      ],
    };

    const testEventCode = process.env["META_TEST_EVENT_CODE"];
    if (testEventCode) payload["test_event_code"] = testEventCode;

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${accessToken}`;

    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[MetaCAPI] Purchase falló (${res.status}) para venta ${sale.id}: ${detail}`);
    }
  } catch (err) {
    console.error(`[MetaCAPI] Error enviando Purchase para venta ${sale.id}:`, err);
  }
}
