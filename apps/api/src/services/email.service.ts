import { Resend } from "resend";
import { inArray } from "drizzle-orm";
import type { Sale, User } from "@kwinna/contracts";
import { db } from "../db";
import { productsTable } from "../db/schema";

// ─── Client ───────────────────────────────────────────────────────────────────

function getClient(): Resend {
  const key = process.env["RESEND_API_KEY"];
  if (!key) throw new Error("RESEND_API_KEY no configurado");
  return new Resend(key);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style:    "currency",
    currency: "ARS",
  }).format(n);
}

async function resolveProductNames(
  productIds: string[]
): Promise<Map<string, string>> {
  if (productIds.length === 0) return new Map();

  const rows = await db
    .select({ id: productsTable.id, name: productsTable.name })
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));

  return new Map(rows.map((r) => [r.id, r.name]));
}

// ─── HTML template ────────────────────────────────────────────────────────────

function buildEmailHtml(sale: Sale, productNames: Map<string, string>): string {
  const itemRows = sale.items
    .map((item) => {
      const name = productNames.get(item.productId) ?? "Producto";
      const size = item.size ? ` (Talle ${item.size})` : "";
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#374151;">
            ${name}${size}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center;color:#374151;">
            ${item.quantity}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;color:#374151;">
            ${formatPrice(item.unitPrice)}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;color:#374151;">
            ${formatPrice(item.subtotal)}
          </td>
        </tr>`;
    })
    .join("");

  const shippingRow =
    sale.shippingCost > 0
      ? `<tr>
          <td colspan="3" style="padding:8px 0;text-align:right;color:#6b7280;">Envío</td>
          <td style="padding:8px 0;text-align:right;color:#6b7280;">${formatPrice(sale.shippingCost)}</td>
        </tr>`
      : `<tr>
          <td colspan="3" style="padding:8px 0;text-align:right;color:#6b7280;">Envío</td>
          <td style="padding:8px 0;text-align:right;color:#16a34a;">Gratis</td>
        </tr>`;

  const address = [
    sale.shippingAddress,
    sale.shippingCity,
    sale.shippingProvince,
  ]
    .filter(Boolean)
    .map((s) => esc(s!))
    .join(", ");

  const orderId = sale.id.split("-")[0]?.toUpperCase() ?? sale.id;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Confirmación de compra — Kwinna</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:#111827;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Kwinna</h1>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:13px;">indumentaria</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:600;">
                ¡Gracias por tu compra, ${esc(sale.customerName.split(" ")[0] ?? "")}!
              </h2>
              <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
                Recibimos tu pedido y ya estamos preparándolo.
                Te contactaremos cuando esté listo para el envío.
              </p>
            </td>
          </tr>

          <!-- Order ID -->
          <tr>
            <td style="padding:0 40px 24px;">
              <div style="background:#f9fafb;border-radius:8px;padding:16px;display:inline-block;">
                <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">N° de orden</span><br>
                <span style="color:#111827;font-size:16px;font-weight:600;font-family:monospace;">${orderId}</span>
              </div>
            </td>
          </tr>

          <!-- Items table -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <thead>
                  <tr style="border-bottom:2px solid #e5e7eb;">
                    <th style="padding:0 0 8px;text-align:left;color:#6b7280;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Producto</th>
                    <th style="padding:0 0 8px;text-align:center;color:#6b7280;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Cant.</th>
                    <th style="padding:0 0 8px;text-align:right;color:#6b7280;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Precio</th>
                    <th style="padding:0 0 8px;text-align:right;color:#6b7280;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                  ${shippingRow}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="padding:16px 0 0;text-align:right;font-weight:600;color:#111827;font-size:15px;">Total</td>
                    <td style="padding:16px 0 0;text-align:right;font-weight:700;color:#111827;font-size:16px;">${formatPrice(sale.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>

          <!-- Shipping address -->
          <tr>
            <td style="padding:0 40px 32px;">
              <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
                <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Dirección de envío</p>
                <p style="margin:0;color:#111827;font-size:14px;">${address}</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                ¿Tenés alguna pregunta? Respondé este mail o contactanos por Instagram.<br>
                Kwinna — indumentaria
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

// ─── Verification email ───────────────────────────────────────────────────────

/**
 * Envía el email de verificación de dirección al nuevo usuario.
 * rawToken es el token en crudo (no el hash) — viaja solo en la URL del email.
 */
export async function sendVerificationEmail(
  user:      Pick<User, "name" | "email">,
  rawToken:  string,
  shortCode?: string,
): Promise<void> {
  const resend  = getClient();
  const appUrl  = process.env["APP_URL"] ?? "http://localhost:3000";
  const from    = process.env["EMAIL_FROM"] ?? "Kwinna <ventas@kwinna.com.ar>";
  const verifyUrl = `${appUrl}/verify-email?token=${rawToken}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Verificá tu email — Kwinna</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

          <tr>
            <td style="background:#111827;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Kwinna</h1>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:13px;">indumentaria</p>
            </td>
          </tr>

          <!-- Banner anti-spam -->
          <tr>
            <td style="padding:16px 24px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;">
                <tr>
                  <td style="padding:12px 16px;">
                    <p style="margin:0;color:#92400e;font-size:12px;line-height:1.6;">
                      <strong>⚠️ ¿Este mail llegó a Spam?</strong> Marcalo como &quot;No es spam&quot; o movelo a tu Bandeja de Entrada antes de hacer clic — algunos clientes de correo deshabilitan los botones en mensajes de Spam.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 40px 32px;text-align:center;">
              <div style="width:56px;height:56px;background:#f0fdf4;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <span style="font-size:28px;">✉️</span>
              </div>
              <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:600;">
                Confirmá tu email, ${esc(user.name.split(" ")[0] ?? "")}
              </h2>
              <p style="margin:0 0 32px;color:#6b7280;font-size:14px;line-height:1.6;max-width:380px;margin-left:auto;margin-right:auto;">
                Hacé clic en el botón para activar tu cuenta y empezar a comprar en Kwinna.
                Este enlace expira en <strong>24 horas</strong>.
              </p>
              <a href="${verifyUrl}"
                 style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
                Verificar mi email
              </a>
            </td>
          </tr>

          ${shortCode ? `
          <tr>
            <td style="padding:0 40px 24px;text-align:center;">
              <div style="border-top:1px solid #e5e7eb;margin-bottom:24px;"></div>
              <p style="margin:0 0 6px;color:#6b7280;font-size:12px;">
                ¿El botón no funciona? Ingresá este código en
                <a href="${appUrl}/verify-email/code" style="color:#111827;font-weight:600;">${appUrl}/verify-email/code</a>
              </p>
              <div style="display:inline-block;margin-top:12px;background:#f3f4f6;border-radius:12px;padding:16px 32px;">
                <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#111827;font-family:monospace;">${shortCode}</span>
              </div>
              <p style="margin:10px 0 0;color:#9ca3af;font-size:11px;">Código de un solo uso · expira en 24 horas</p>
            </td>
          </tr>
          ` : `
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.8;">
                Si el botón no funciona, copiá y pegá este enlace en tu navegador:
              </p>
              <p style="margin:8px 0 0;font-size:12px;word-break:break-all;background:#f3f4f6;border-radius:6px;padding:10px 14px;text-align:left;">
                <a href="${verifyUrl}" style="color:#111827;text-decoration:underline;">${verifyUrl}</a>
              </p>
            </td>
          </tr>
          `}

          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                Si no creaste esta cuenta, podés ignorar este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from,
    to:      user.email,
    subject: "Verificá tu email para activar tu cuenta en Kwinna",
    html,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ─── Password reset email ─────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  user:     Pick<User, "name" | "email">,
  rawToken: string,
): Promise<void> {
  const resend   = getClient();
  const appUrl   = process.env["APP_URL"] ?? "http://localhost:3000";
  const from     = process.env["EMAIL_FROM"] ?? "Kwinna <ventas@kwinna.com.ar>";
  const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Restablecer contraseña — Kwinna</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

          <tr>
            <td style="background:#111827;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Kwinna</h1>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:13px;">indumentaria</p>
            </td>
          </tr>

          <!-- Banner anti-spam -->
          <tr>
            <td style="padding:16px 24px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;">
                <tr>
                  <td style="padding:12px 16px;">
                    <p style="margin:0;color:#92400e;font-size:12px;line-height:1.6;">
                      <strong>⚠️ ¿Este mail llegó a Spam?</strong> Marcalo como &quot;No es spam&quot; o movelo a tu Bandeja de Entrada antes de hacer clic — algunos clientes de correo deshabilitan los botones en mensajes de Spam.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 40px 32px;text-align:center;">
              <div style="width:56px;height:56px;background:#fef2f2;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <span style="font-size:28px;">🔑</span>
              </div>
              <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:600;">
                Restablecer contraseña
              </h2>
              <p style="margin:0 0 8px;color:#374151;font-size:14px;">
                Hola, ${esc(user.name.split(" ")[0] ?? "")}
              </p>
              <p style="margin:0 0 32px;color:#6b7280;font-size:14px;line-height:1.6;max-width:380px;margin-left:auto;margin-right:auto;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta.
                Hacé clic en el botón para crear una nueva. Este enlace expira en <strong>1 hora</strong>.
              </p>
              <a href="${resetUrl}"
                 style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
                Restablecer contraseña
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.8;">
                Si el botón no funciona, copiá y pegá este enlace en tu navegador:
              </p>
              <p style="margin:8px 0 0;font-size:12px;word-break:break-all;background:#f3f4f6;border-radius:6px;padding:10px 14px;text-align:left;">
                <a href="${resetUrl}" style="color:#111827;text-decoration:underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                Si no solicitaste este cambio, podés ignorar este mensaje. Tu contraseña no será modificada.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from,
    to:      user.email,
    subject: "Restablecé tu contraseña — Kwinna",
    html,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ─── Sale confirmation email ──────────────────────────────────────────────────

/**
 * Envía un mail de confirmación de compra al cliente.
 * Resuelve los nombres de producto desde la BD antes de renderizar.
 *
 * No lanza — se espera llamar como fire-and-forget con `.catch()`.
 */
export async function sendSaleConfirmationEmail(sale: Sale): Promise<void> {
  if (!sale.customerEmail) return;

  const resend = getClient();

  const productIds = [...new Set(sale.items.map((i) => i.productId))];
  const productNames = await resolveProductNames(productIds);

  const html = buildEmailHtml(sale, productNames);
  const from = process.env["EMAIL_FROM"] ?? "Kwinna <ventas@kwinna.com.ar>";

  const { error } = await resend.emails.send({
    from,
    to:      sale.customerEmail,
    subject: `Confirmamos tu compra — Kwinna`,
    html,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}
