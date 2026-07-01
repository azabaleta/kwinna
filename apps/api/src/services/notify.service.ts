import type { Sale } from "@kwinna/contracts";

// ─── Push notifications vía ntfy ────────────────────────────────────────────────
// Envía notificaciones push al celular (app ntfy, gratuita) mediante un simple
// HTTP POST a un "topic". Sin dependencias nuevas (fetch global de Node 20+),
// sin Apple Developer, sin APNs. Destinatario único definido por env vars:
//   NTFY_URL    — server ntfy (default https://ntfy.sh)
//   NTFY_TOPIC  — topic con sufijo secreto (requerido; sin él, no se envía nada)
//   NTFY_TOKEN  — opcional, solo si se auto-hospeda ntfy con auth (Bearer)

// Prioridades soportadas por ntfy: 1 (min) … 5 (max). Default 3.
type PushPriority = 1 | 2 | 3 | 4 | 5;

interface PushPayload {
  title:     string;
  message:   string;
  priority?: PushPriority;
  tags?:     string[];   // emojis/keywords de ntfy, ej: ["moneybag"]
}

const PESOS = new Intl.NumberFormat("es-AR", {
  style:                 "currency",
  currency:              "ARS",
  maximumFractionDigits: 0,
});

/** Código corto del ticket: primeros 10 hex del UUID, igual criterio que el resto del sistema. */
function shortCode(saleId: string): string {
  return saleId.replace(/-/g, "").slice(0, 10).toUpperCase();
}

/**
 * Envía una notificación push al topic configurado.
 * Fire-and-forget: nunca debe romper el flujo que la invoca.
 * Si NTFY_TOPIC no está seteado, loguea un warning y no hace nada.
 */
export async function sendPushNotification(payload: PushPayload): Promise<void> {
  const base  = process.env["NTFY_URL"] ?? "https://ntfy.sh";
  const topic = process.env["NTFY_TOPIC"];
  const token = process.env["NTFY_TOKEN"];

  if (!topic) {
    console.warn("[Notify] NTFY_TOPIC no configurado — push omitido");
    return;
  }

  const headers: Record<string, string> = {
    Title:    payload.title,
    Priority: String(payload.priority ?? 3),
  };
  if (payload.tags?.length) headers["Tags"] = payload.tags.join(",");
  if (token)               headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${base}/${topic}`, {
    method:  "POST",
    headers,
    body:    payload.message,
  });

  if (!res.ok) {
    throw new Error(`ntfy respondió ${res.status} ${res.statusText}`);
  }
}

/** Construye el push de "pago confirmado" a partir de una venta. */
export function formatSaleAlert(sale: Sale): PushPayload {
  return {
    title:    "💰 Pago confirmado",
    message:  `Orden #${shortCode(sale.id)} — ${PESOS.format(sale.total)}\nCliente: ${sale.customerName}`,
    priority: 4,
    tags:     ["moneybag"],
  };
}

/** Construye el push de "órdenes pendientes hace +1h" (agregado, para no spamear). */
export function formatStalePendingAlert(sales: Sale[]): PushPayload {
  const count = sales.length;
  const lines = sales
    .slice(0, 10)
    .map((s) => `#${shortCode(s.id)} — ${PESOS.format(s.total)} (${s.customerName})`)
    .join("\n");
  const extra = count > 10 ? `\n…y ${count - 10} más` : "";

  return {
    title:    count === 1
      ? "⏳ 1 orden lleva +1h pendiente"
      : `⏳ ${count} órdenes llevan +1h pendientes`,
    message:  `${lines}${extra}`,
    priority: 4,
    tags:     ["hourglass_flowing_sand"],
  };
}
