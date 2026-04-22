/**
 * Genera y persiste un ID de sesión en sessionStorage.
 * Se reinicia al cerrar la pestaña — una sesión = una visita continua.
 * SSR-safe: devuelve "" en el servidor (no se registra ningún evento).
 */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  const KEY = "kwinna_sid";
  let sid = sessionStorage.getItem(KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(KEY, sid);
  }
  return sid;
}
