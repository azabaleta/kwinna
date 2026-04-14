import crypto from "node:crypto";
import type { Sale } from "@kwinna/contracts";
import { getPaymentClient, getPreferenceClient } from "../lib/mercadopago";

// ─── Env helpers ──────────────────────────────────────────────────────────────

function getAppUrl(): string {
  return process.env["APP_URL"] ?? "http://localhost:3000";
}

function getApiUrl(): string {
  return process.env["API_URL"] ?? "http://localhost:3001";
}

// ─── Preference ───────────────────────────────────────────────────────────────

export interface MPPreferenceResult {
  preferenceId: string;
  /** URL de producción — usar en producción. */
  initPoint: string;
  /** URL de sandbox — usar con credenciales TEST_*. */
  sandboxInitPoint: string;
}

/**
 * Crea una Preference de MercadoPago para la venta indicada.
 *
 * - Los ítems se mapean desde los SaleItems del contrato.
 * - `external_reference` es el UUID de la venta en nuestra BD.
 * - `notification_url` recibe los webhooks de pago de MP.
 */
export async function createMPPreference(
  sale: Sale
): Promise<MPPreferenceResult> {
  const appUrl = getAppUrl();
  const apiUrl = getApiUrl();

  const preference = getPreferenceClient();

  const result = await preference.create({
    body: {
      external_reference: sale.id,

      items: sale.items.map((item) => ({
        id:         item.productId,
        title:      item.size
          ? `Producto (talle ${item.size})`
          : "Producto Kwinna",
        quantity:   item.quantity,
        unit_price: item.unitPrice,
        currency_id: "ARS",
      })),

      // Costo de envío como ítem adicional si aplica
      ...(sale.shippingCost > 0 && {
        shipments: {
          cost: sale.shippingCost,
          mode: "not_specified",
        },
      }),

      payer: {
        name:  sale.customerName,
        email: sale.customerEmail,
        phone: sale.customerPhone
          ? { number: sale.customerPhone }
          : undefined,
      },

      back_urls: {
        success: `${appUrl}/checkout/success`,
        failure: `${appUrl}/checkout`,
        pending: `${appUrl}/checkout/success`,
      },
      auto_return: "approved",

      // MP llama a este endpoint cuando el pago cambia de estado
      notification_url: `${apiUrl}/sales/webhook`,
    },
  });

  if (!result.init_point || !result.sandbox_init_point || !result.id) {
    throw new Error("[MercadoPago] La Preference no devolvió init_point.");
  }

  return {
    preferenceId:     result.id,
    initPoint:        result.init_point,
    sandboxInitPoint: result.sandbox_init_point,
  };
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface MPPaymentInfo {
  id:                number;
  status:            string;
  externalReference: string | null;
}

/**
 * Consulta el estado de un pago en MP.
 * Siempre re-valida el estado desde la API (nunca confiamos solo en el webhook body).
 */
export async function getMPPayment(paymentId: number): Promise<MPPaymentInfo> {
  const paymentClient = getPaymentClient();
  const result = await paymentClient.get({ id: paymentId });

  return {
    id:                result.id ?? paymentId,
    status:            result.status ?? "unknown",
    externalReference: result.external_reference ?? null,
  };
}

// ─── Webhook signature verification ──────────────────────────────────────────

/**
 * Verifica la firma HMAC-SHA256 que MP envía en el header `x-signature`.
 *
 * Formato del header: `ts=<epoch>;v1=<hmac>`
 * Plantilla de firma:  `id:<dataId>;request-id:<xRequestId>;ts:<ts>`
 *
 * Si MP_WEBHOOK_SECRET no está configurado, devuelve `true` (permisivo en dev).
 * En producción, configurar siempre el secret.
 */
export function verifyMPSignature(params: {
  xSignature:  string;
  xRequestId:  string;
  dataId:      string;
}): boolean {
  const secret = process.env["MP_WEBHOOK_SECRET"];
  if (!secret) return true; // dev/sandbox sin secret configurado

  const { xSignature, xRequestId, dataId } = params;

  // Parsear "ts=...;v1=..."
  const parts = Object.fromEntries(
    xSignature.split(";").map((p) => p.split("=") as [string, string])
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(v1,       "hex"),
    Buffer.from(expected, "hex")
  );
}
