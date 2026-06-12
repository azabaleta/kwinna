// ─── Contacto de la tienda ────────────────────────────────────────────────────
// Formato internacional sin '+': wa.me exige el prefijo 549 para móviles argentinos.

export const WHATSAPP_NUMBER = "5492993294998";

export function waLink(text?: string): string {
  return text
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${WHATSAPP_NUMBER}`;
}
