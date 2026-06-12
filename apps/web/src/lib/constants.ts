// ─── Contacto de la tienda ────────────────────────────────────────────────────
// Formato internacional sin '+': wa.me exige el prefijo 549 para móviles argentinos.

export const WHATSAPP_NUMBER = "5492993294998";

// ─── Campaña de lanzamiento ───────────────────────────────────────────────────
// Transferencia: 20% base + 10% código = 30% total · Tarjeta (MP): 10% con código.
// El cupón real debe existir en /admin/promotions con este código exacto.

export const LAUNCH_PROMO_CODE = "SOYKWINNA";

export function waLink(text?: string): string {
  return text
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${WHATSAPP_NUMBER}`;
}
