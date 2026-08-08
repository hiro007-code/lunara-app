// Bewusst einfach gehaltener, handgeschriebener Service Worker (SPEC.md §4) –
// keine Library nötig: cached App-Shell-URLs beim Install, danach alle
// same-origin GET-Requests "cache-first" beim ersten Laden (Laufzeit-Cache),
// damit auch content-gehashte Next.js-Build-Assets ohne bekannte Dateinamen
// erfasst werden. So funktioniert die App offline nach dem ersten Laden (§7).

const CACHE_VERSION = "lunara-v1";
const APP_SHELL = ["/", "/planung", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // /api/* nie cachen (z. B. /api/stats) – immer live vom Server, nie veraltet
  // oder versehentlich offline aus dem Cache beantwortet.
  if (new URL(request.url).pathname.startsWith("/api/")) {
    return;
  }

  // Next.js hängt beim Link-Prefetching einen zufälligen "_rsc"-Query-Parameter an
  // (bei jedem Prefetch neu) – für den Cache-Key ignorieren, sonst legt jeder
  // Prefetch einen neuen, nie wiederverwendbaren Eintrag an.
  const cacheUrl = new URL(request.url);
  cacheUrl.searchParams.delete("_rsc");
  const cacheKey = cacheUrl.toString();

  event.respondWith(
    // ignoreVary: Next.js-Antworten setzen "Vary: rsc, next-router-state-tree, ...";
    // je nach Prefetch- vs. Vollnavigation unterscheiden sich diese Header, ohne
    // ignoreVary würde ein Offline-Reload sonst trotz vorhandenem Cache-Eintrag fehlschlagen.
    caches.match(cacheKey, { ignoreVary: true }).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(cacheKey, responseClone));
          }
          return response;
        })
        .catch(() => cached);
    }),
  );
});
