import { Body, Illumination, MoonPhase, NextMoonQuarter, SearchMoonPhase, SearchMoonQuarter } from "astronomy-engine";
import { calendarDateToUTC, shiftCalendarDate, toCalendarDate } from "./timezone";

// Wrapper um astronomy-engine für alle Mondberechnungen (SPEC.md §3).
// Alle Zeitpunkte werden intern strikt in UTC gehalten.

const FULL_MOON_LONGITUDE = 180;
const SEARCH_WINDOW_DAYS = 40; // > 1 synodischer Monat (~29.53 Tage), sicherer Suchradius
const DANGER_ZONE_RADIUS_DAYS = 2;

/** Nächster Vollmond ab dem angegebenen Zeitpunkt (UTC). */
export function nextFullMoon(from: Date): Date {
  const result = SearchMoonPhase(FULL_MOON_LONGITUDE, from, SEARCH_WINDOW_DAYS);
  if (!result) {
    throw new Error("Kein Vollmond im Suchfenster gefunden.");
  }
  return result.date;
}

/** Letzter Vollmond vor dem angegebenen Zeitpunkt (UTC). */
export function previousFullMoon(from: Date): Date {
  const result = SearchMoonPhase(FULL_MOON_LONGITUDE, from, -SEARCH_WINDOW_DAYS);
  if (!result) {
    throw new Error("Kein Vollmond im Suchfenster gefunden.");
  }
  return result.date;
}

/** Alle Vollmonde im Zeitraum [from, to] (UTC), z. B. für die 18-Monats-Jahresübersicht. */
export function fullMoonsInRange(from: Date, to: Date): Date[] {
  const results: Date[] = [];
  let quarter = SearchMoonQuarter(from);
  while (quarter.time.date <= to) {
    if (quarter.quarter === 2) {
      results.push(quarter.time.date);
    }
    quarter = NextMoonQuarter(quarter);
  }
  return results;
}

/** Aktueller Beleuchtungsgrad (0–1) sowie ob der Mond zu- oder abnimmt. */
export function moonIllumination(at: Date): { fraction: number; waxing: boolean } {
  const illumination = Illumination(Body.Moon, at);
  const longitude = MoonPhase(at);
  return {
    fraction: illumination.phase_fraction,
    waxing: longitude < FULL_MOON_LONGITUDE,
  };
}

/**
 * Die 5 Kalendertage der Gefahrenzone (Vollmond-Tag ±2 Tage) in der angegebenen
 * Zeitzone, als ISO-Datumsstrings (YYYY-MM-DD), aufsteigend sortiert.
 */
export function dangerZoneDays(fullMoon: Date, timeZone: string): string[] {
  const centerDay = toCalendarDate(fullMoon, timeZone);
  const days: string[] = [];
  for (let offset = -DANGER_ZONE_RADIUS_DAYS; offset <= DANGER_ZONE_RADIUS_DAYS; offset++) {
    days.push(shiftCalendarDate(centerDay, offset));
  }
  return days;
}

/**
 * Reise-Ampel (SPEC.md §2.2b): rot, wenn ein Vollmond-Kalendertag im Zeitraum liegt,
 * gelb, wenn nur die Gefahrenzone berührt wird, sonst grün.
 * `start`/`end` sind Kalendertage (YYYY-MM-DD) in der angegebenen Zeitzone, inklusive.
 */
export function checkDateRange(
  start: string,
  end: string,
  timeZone: string,
): { status: "green" | "yellow" | "red"; fullMoonDates: string[] } {
  const searchFrom = calendarDateToUTC(shiftCalendarDate(start, -(DANGER_ZONE_RADIUS_DAYS + 2)));
  const searchTo = calendarDateToUTC(shiftCalendarDate(end, DANGER_ZONE_RADIUS_DAYS + 2));

  const candidates = fullMoonsInRange(searchFrom, searchTo);

  const touchedDates = new Set<string>();
  let hasFullMoonInRange = false;

  for (const fullMoon of candidates) {
    const fullMoonDay = toCalendarDate(fullMoon, timeZone);
    const zone = dangerZoneDays(fullMoon, timeZone);
    const touchesRange = zone.some((day) => day >= start && day <= end);
    if (!touchesRange) continue;

    touchedDates.add(fullMoonDay);
    if (fullMoonDay >= start && fullMoonDay <= end) {
      hasFullMoonInRange = true;
    }
  }

  const status: "green" | "yellow" | "red" = hasFullMoonInRange ? "red" : touchedDates.size > 0 ? "yellow" : "green";

  return { status, fullMoonDates: [...touchedDates].sort() };
}
