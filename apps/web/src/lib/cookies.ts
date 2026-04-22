const COOKIE_NAME    = "kwinna-token";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8h — mismo TTL que el JWT

// En producción siempre HTTPS — el flag Secure evita que el token viaje en HTTP plano.
// En localhost no se puede usar Secure porque el browser lo bloquearía.
const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";

export function setAuthCookie(token: string): void {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    `path=/`,
    `max-age=${COOKIE_MAX_AGE}`,
    `SameSite=Strict`,
  ];
  if (isSecure) parts.push("Secure");
  document.cookie = parts.join("; ");
}

export function clearAuthCookie(): void {
  const parts = [`${COOKIE_NAME}=`, `path=/`, `max-age=0`, `SameSite=Strict`];
  if (isSecure) parts.push("Secure");
  document.cookie = parts.join("; ");
}
