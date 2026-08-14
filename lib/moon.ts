import { Body, Illumination, MoonPhase, NextMoonQuarter, SearchMoonPhase, SearchMoonQuarter } from "astronomy-engine";
import { calendarDateToUTC, calendarDayDiff, shiftCalendarDate, toCalendarDate } from "./timezone";

// Wrapper um astronomy-engine für alle Mondberechnungen (SPEC.md §3).
// Alle Zeitpunkte werden intern strikt in UTC gehalten.

const FULL_MOON_LONGITUDE = 180;
const SEARCH_WINDOW_DAYS = 40; // > 1 synodischer Monat (~29.53 Tage), sicherer Suchradius

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
 * Kalendertage der kritischen Phase in der angegebenen Zeitzone, als
 * ISO-Datumsstrings (YYYY-MM-DD), aufsteigend sortiert. `startOffset`/`endOffset`
 * sind ganze Tage relativ zum Vollmond-Kalendertag (negativ = vorher, 0 =
 * Vollmond, positiv = nachher); `startOffset <= endOffset` wird vorausgesetzt
 * und von der UI garantiert (SPEC.md §2.2).
 */
export function criticalPhaseDays(fullMoon: Date, timeZone: string, startOffset: number, endOffset: number): string[] {
  const centerDay = toCalendarDate(fullMoon, timeZone);
  const days: string[] = [];
  for (let offset = startOffset; offset <= endOffset; offset++) {
    days.push(shiftCalendarDate(centerDay, offset));
  }
  return days;
}

export type DateRangeCheck = {
  status: "free" | "critical";
  overlapDays: string[];
  totalTripDays: number;
  fullMoonDates: string[];
};

/**
 * Datums-Check (SPEC.md §2.2b): "kritisch", wenn der Reisezeitraum eine
 * kritische Phase berührt, sonst "frei". Kein Zwischenzustand – der
 * Sicherheitsabstand ist Sache der konfigurierten Offsets selbst.
 * `start`/`end` sind Kalendertage (YYYY-MM-DD) in der angegebenen Zeitzone, inklusive.
 */
export function checkDateRange(
  start: string,
  end: string,
  timeZone: string,
  startOffset: number,
  endOffset: number,
): DateRangeCheck {
  const totalTripDays = calendarDayDiff(start, end) + 1;

  // Suchfenster: ein Vollmond kann bis zu |startOffset|/|endOffset| Tage ausserhalb
  // des Reisezeitraums liegen und dessen kritische Phase trotzdem berühren.
  const searchFrom = calendarDateToUTC(shiftCalendarDate(start, -endOffset - 1));
  const searchTo = calendarDateToUTC(shiftCalendarDate(end, -startOffset + 1));

  const candidates = fullMoonsInRange(searchFrom, searchTo);

  const overlapDays = new Set<string>();
  const fullMoonDates = new Set<string>();

  for (const fullMoon of candidates) {
    const phase = criticalPhaseDays(fullMoon, timeZone, startOffset, endOffset);
    const overlap = phase.filter((day) => day >= start && day <= end);
    if (overlap.length === 0) continue;

    overlap.forEach((day) => overlapDays.add(day));
    fullMoonDates.add(toCalendarDate(fullMoon, timeZone));
  }

  return {
    status: overlapDays.size > 0 ? "critical" : "free",
    overlapDays: [...overlapDays].sort(),
    totalTripDays,
    fullMoonDates: [...fullMoonDates].sort(),
  };
}
