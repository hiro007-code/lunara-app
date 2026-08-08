import { addDays, subDays } from "date-fns";

// Zeitzonen-Helpers, Zonenliste und Favoriten-Verwaltung (SPEC.md §2.3).

export const DEFAULT_TIMEZONE = "Europe/Zurich";
export const MAX_FAVORITES = 4;

const ACTIVE_TIMEZONE_STORAGE_KEY = "lunara:active-timezone";
const FAVORITE_TIMEZONES_STORAGE_KEY = "lunara:favorite-timezones";

/**
 * Ordnet einen UTC-Zeitpunkt dem Kalendertag (YYYY-MM-DD) in der angegebenen
 * IANA-Zeitzone zu. Vollmond nahe Mitternacht kann so je nach Zeitzone auf
 * unterschiedliche Tage fallen (SPEC.md §3).
 */
export function toCalendarDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

/** Wandelt einen Kalendertag (YYYY-MM-DD) in einen UTC-Anker-Zeitpunkt (Mitternacht UTC) um. */
export function calendarDateToUTC(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Verschiebt einen Kalendertag (YYYY-MM-DD) um `days` Tage (reine Kalenderarithmetik). */
export function shiftCalendarDate(isoDate: string, days: number): string {
  const anchor = calendarDateToUTC(isoDate);
  const shifted = days >= 0 ? addDays(anchor, days) : subDays(anchor, -days);
  return toCalendarDate(shifted, "UTC");
}

/** Anzahl Kalendertage von `fromDay` bis `toDay` (beide YYYY-MM-DD), z. B. für Countdown-Anzeigen. */
export function calendarDayDiff(fromDay: string, toDay: string): number {
  return Math.round((calendarDateToUTC(toDay).getTime() - calendarDateToUTC(fromDay).getTime()) / (24 * 60 * 60 * 1000));
}

export function formatWeekday(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("de-CH", { timeZone, weekday: "long" }).format(date);
}

export function formatDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("de-CH", { timeZone, day: "numeric", month: "short" }).format(date);
}

export function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("de-CH", { timeZone, hour: "2-digit", minute: "2-digit" }).format(date);
}

/** Alle vom Laufzeitumfeld unterstützten IANA-Zeitzonen. */
export function getAllTimezones(): string[] {
  return Intl.supportedValuesOf("timeZone");
}

/** Prüft, ob ein Wert eine gültige IANA-Zeitzone ist (z. B. für serverseitige Validierung). */
export function isValidTimezone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Zerlegt z. B. "Europe/Zurich" in { city: "Zurich", region: "Europe" } (Unterstriche → Leerzeichen). */
export function getTimezoneLabel(timezone: string): { city: string; region: string } {
  const parts = timezone.split("/");
  const city = parts[parts.length - 1].replace(/_/g, " ");
  const region = parts.slice(0, -1).join("/").replace(/_/g, " ");
  return { city, region };
}

function isLocalStorageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

/** Fügt eine Zeitzone zu den Favoriten hinzu (keine Duplikate, max. `MAX_FAVORITES`). Reine Funktion, keine Persistenz. */
export function addFavoriteTimezone(favorites: string[], timezone: string): string[] {
  if (favorites.includes(timezone) || favorites.length >= MAX_FAVORITES) {
    return favorites;
  }
  return [...favorites, timezone];
}

/** Entfernt eine Zeitzone aus den Favoriten. Reine Funktion, keine Persistenz. */
export function removeFavoriteTimezone(favorites: string[], timezone: string): string[] {
  return favorites.filter((favorite) => favorite !== timezone);
}

/** Aktive Zeitzone aus localStorage – SSR-sicher (liefert den Default ausserhalb des Browsers). */
export function loadActiveTimezone(): string {
  if (!isLocalStorageAvailable()) return DEFAULT_TIMEZONE;
  try {
    return localStorage.getItem(ACTIVE_TIMEZONE_STORAGE_KEY) ?? DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function saveActiveTimezone(timezone: string): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(ACTIVE_TIMEZONE_STORAGE_KEY, timezone);
  } catch {
    // localStorage kann z. B. im privaten Modus nicht verfügbar sein – Auswahl bleibt dann nur für die Sitzung aktiv.
  }
}

/** Favoriten-Zeitzonen aus localStorage – SSR-sicher (liefert eine leere Liste ausserhalb des Browsers). */
export function loadFavoriteTimezones(): string[] {
  if (!isLocalStorageAvailable()) return [];
  try {
    const raw = localStorage.getItem(FAVORITE_TIMEZONES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

export function saveFavoriteTimezones(favorites: string[]): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(FAVORITE_TIMEZONES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // localStorage kann z. B. im privaten Modus nicht verfügbar sein – Favoriten bleiben dann nur für die Sitzung aktiv.
  }
}
