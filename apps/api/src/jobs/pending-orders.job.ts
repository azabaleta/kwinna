import { schedule } from "node-cron";
import { findStalePendingSales, markStaleAlertSent } from "../db/repositories/sale.repository";
import { sendPushNotification, formatStalePendingAlert } from "../services/notify.service";

// ─── Alerta de órdenes estancadas en "pending" ──────────────────────────────────
// Cada 15 min busca órdenes que llevan más de 1h en estado pending sin alertar,
// envía un único push agregado (para no spamear) y las marca como alertadas
// (idempotencia vía columna stale_alert_sent_at). Una orden que se paga o se
// cancela sale de "pending" y nunca dispara la alerta.

const THRESHOLD_MINUTES = 60;

async function runPendingOrdersCheck(): Promise<void> {
  const tag = "[Pending Orders Job]";
  try {
    const stale = await findStalePendingSales(THRESHOLD_MINUTES);
    if (stale.length === 0) return;

    await sendPushNotification(formatStalePendingAlert(stale));

    // Marcar como alertadas solo si el push salió bien (si falló, reintenta en la próxima corrida).
    await Promise.all(stale.map((s) => markStaleAlertSent(s.id)));

    process.stdout.write(`${tag} ${stale.length} orden(es) pendiente(s) +1h alertada(s)\n`);
  } catch (err) {
    console.error(`${tag} ERROR:`, err);
  }
}

// ─── Registro del cron ────────────────────────────────────────────────────────
// "*/15 * * * *" → cada 15 minutos.

export function registerPendingOrdersJob(): void {
  schedule("*/15 * * * *", runPendingOrdersCheck);
  process.stdout.write("[Pending Orders Job] Cron registrado — corre cada 15 min (umbral 1h)\n");
}
