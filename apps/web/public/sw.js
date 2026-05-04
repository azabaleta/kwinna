// Kwinna PWA Service Worker
// Estrategia: Cache-first para assets estáticos, network-first para API y páginas.

const CACHE_NAME = "kwinna-v1";

// Assets que siempre queremos en caché (shell de la app)
const PRECACHE_URLS = [
  "/",
  "/shop",
  "/offline",
];

// ── Install: precachear el shell ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: limpiar cachés viejas ──────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first con fallback a caché ─────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptar requests del mismo origen (no APIs externas ni CDN)
  if (url.origin !== location.origin) return;

  // Ignorar requests de autenticación y admin — siempre van a red
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Guardar copia en caché solo para GET exitosos
        if (request.method === "GET" && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        // Sin red → buscar en caché, o devolver página offline
        caches.match(request).then(
          (cached) => cached ?? caches.match("/offline")
        )
      )
  );
});
