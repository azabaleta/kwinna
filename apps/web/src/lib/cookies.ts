const COOKIE_NAME = "kwinna-token";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8h — mismo TTL que el JWT

export function setAuthCookie(token: string): void {
  document.cookie = [
    `${COOKIE_NAME}=${token}`,
    `path=/`,
    `max-age=${COOKIE_MAX_AGE}`,
    `SameSite=Strict`,
  ].join("; ");
}

export function clearAuthCookie(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}
