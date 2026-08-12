import type { Platform } from "./activation";

// Admin-Statistik (SPEC.md §2.7): Token-Übernahme aus der URL, lokale Speicherung und
// Laden der erweiterten Stats. Kein Einfluss auf Onboarding, Aktivierung oder
// Erinnerungen – reine Ansicht für die Betreiberin.

const ADMIN_TOKEN_STORAGE_KEY = "lunara:admin-token";
const STATS_TIMEOUT_MS = 5000;

export type AdminStats = {
  total: number;
  last7days: number;
  platforms: Record<Platform, number>;
  pushSubscriptions: number;
};

export type AdminSessionState =
  | { status: "hidden" }
  | { status: "visible"; stats: AdminStats }
  | { status: "invalid-token" }
  | { status: "unavailable" };

function isLocalStorageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

export function getStoredAdminToken(): string | null {
  if (!isLocalStorageAvailable()) return null;
  try {
    return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeAdminToken(token: string): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  } catch {
    // localStorage kann z. B. im privaten Modus fehlschlagen – Token bleibt dann nur für die Sitzung aktiv.
  }
}

export function clearAdminToken(): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    // Best effort.
  }
}

/** Reine Extraktion des admin-Query-Parameters – auch ohne Browser-Umgebung testbar. */
export function extractAdminTokenFromSearch(search: string): string | null {
  const token = new URLSearchParams(search).get("admin");
  return token && token.length > 0 ? token : null;
}

/**
 * Übernimmt einen Admin-Token aus der URL (?admin=...) nach localStorage und entfernt ihn
 * sofort wieder aus der Adresszeile (history.replaceState, andere Parameter bleiben
 * erhalten) – der Token taucht so nie im Verlauf oder in geteilten Links auf. Validiert
 * nichts selbst; das übernimmt allein der Server beim nächsten Stats-Aufruf (loadAdminStats()).
 */
export function captureAdminTokenFromUrl(): void {
  if (typeof window === "undefined") return;
  const token = extractAdminTokenFromSearch(window.location.search);
  if (!token) return;

  storeAdminToken(token);

  const url = new URL(window.location.href);
  url.searchParams.delete("admin");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

async function fetchAdminStats(
  token: string,
): Promise<{ ok: true; stats: AdminStats } | { ok: false; unauthorized: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STATS_TIMEOUT_MS);
  try {
    const response = await fetch("/api/stats", {
      headers: { "x-admin-token": token },
      signal: controller.signal,
    });
    if (response.status === 401) return { ok: false, unauthorized: true };
    if (!response.ok) return { ok: false, unauthorized: false };
    return { ok: true, stats: (await response.json()) as AdminStats };
  } catch {
    return { ok: false, unauthorized: false };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Lädt den Admin-Bereich (AdminPanel, Planung-View): ohne gespeicherten Token bleibt er
 * verborgen ("hidden"). Ein ungültiger Token wird verworfen (Flag weg, "invalid-token"
 * mit dezentem Hinweis); ein temporärer Fehler (DB/Netz) behält den Token, zeigt aber
 * ebenfalls keine Zahlen ("unavailable") – Ablehnung wegen Serverfehler ist kein Beweis
 * für einen falschen Token.
 */
export async function loadAdminStats(): Promise<AdminSessionState> {
  const token = getStoredAdminToken();
  if (!token) return { status: "hidden" };

  const result = await fetchAdminStats(token);
  if (result.ok) return { status: "visible", stats: result.stats };
  if (result.unauthorized) {
    clearAdminToken();
    return { status: "invalid-token" };
  }
  return { status: "unavailable" };
}
