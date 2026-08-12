// Bewusst einfach gehaltener, handgeschriebener Service Worker (SPEC.md §4).
// Zwei Strategien je nach Request-Typ (Etappe 9.1 – vorher war alles cache-first,
// wodurch Deployments installierte Apps mit gefülltem Cache nie erreicht haben):
// - Navigationen (HTML-Seiten, request.mode "navigate"): network-first, siehe
//   fetch-Handler unten. Updates kommen so sofort an; nur bei Netzfehler
//   (offline) fällt die Antwort auf den zuletzt gecachten Stand zurück.
// - Alles andere (content-gehashte /_next/static/-Assets, Icons, Manifest):
//   cache-first als Laufzeit-Cache, damit auch Next.js-Build-Assets ohne
//   bekannte Dateinamen erfasst werden. Für /_next/static/ ist das korrekt,
//   weil der Dateiname sich bei jeder Änderung ändert (unveränderlich); für
//   Icons/Manifest ist es ein bewusster Kompromiss zugunsten von Offline/
//   Ladezeit (§7).
// So funktioniert die App offline nach dem ersten Laden (§7). Wichtig: Wer an
// dieser Cache-Struktur etwas ändert, muss CACHE_VERSION erhöhen, sonst bleiben
// installierte Clients auf dem alten (potenziell inkompatiblen) Cache-Inhalt
// hängen – der activate-Handler unten löscht alte Versionen nur bei einer
// tatsächlichen Versionsänderung.

const CACHE_VERSION = "lunara-v2";
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

  // Navigationen (Seitenaufrufe, z. B. App-Start von Homescreen/URL, Reload):
  // network-first. Erst das Netz versuchen und die frische Antwort cachen; nur
  // bei Netzfehler (offline) auf den zuletzt gecachten Stand zurückfallen. So
  // sieht eine bereits installierte App bei jedem Öffnen mit Netz automatisch
  // den aktuellen Deploy-Stand (Etappe 9.1) – cache-first hätte das verhindert.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(cacheKey, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(cacheKey, { ignoreVary: true })),
    );
    return;
  }

  // Alles andere (Build-Assets, Icons, Manifest): cache-first, siehe Kommentar
  // am Dateianfang.
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

// Vollmond-Erinnerungen (SPEC.md §2.5): zeigt eine ankommende Push-Nachricht an.
// Bewusst einfach – kein Rich-Content, keine Actions.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "Lunara";
  const options = {
    body: data.body || "Bald ist Vollmond.",
    icon: "/icon-192",
    badge: "/icon-192",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return self.clients.openWindow("/");
    }),
  );
});
