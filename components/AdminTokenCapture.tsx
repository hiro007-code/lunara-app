"use client";

import { useEffect } from "react";
import { captureAdminTokenFromUrl } from "@/lib/admin";

/**
 * Übernimmt einen Admin-Token aus der URL (?admin=..., SPEC.md §2.7) beim Laden
 * einer beliebigen Seite und entfernt ihn sofort wieder aus der Adresszeile.
 * Rendert nichts – global in layout.tsx, analog zu ServiceWorkerRegistration.
 */
export function AdminTokenCapture() {
  useEffect(() => {
    captureAdminTokenFromUrl();
  }, []);

  return null;
}
