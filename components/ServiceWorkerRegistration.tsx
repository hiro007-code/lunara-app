"use client";

import { useEffect } from "react";

/** Registriert den Service Worker für Offline-Fähigkeit (SPEC.md §4, §7). */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline-Fähigkeit ist ein Komfort-Feature – ein Fehler hier darf die App nicht blockieren.
      });
    }
  }, []);

  return null;
}
