import { addDays, subDays } from "date-fns";

// Zeitzonen-Helpers – Favoriten-Verwaltung (localStorage) folgt in Etappe 5 (SPEC.md §2.3).

export const DEFAULT_TIMEZONE = "Europe/Zurich";

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
