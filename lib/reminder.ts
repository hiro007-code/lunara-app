import { nextFullMoon } from "./moon";
import { calendarDayDiff, toCalendarDate } from "./timezone";

// Erinnerungstag-Logik für den Cron-Versand (SPEC.md §2.6): reine Funktionen,
// damit sie ohne Datenbank/Netzwerk testbar sind (Systemzeit fixierbar).

const REMINDER_DAYS_BEFORE = [7, 3] as const;
export type ReminderDay = (typeof REMINDER_DAYS_BEFORE)[number];

/**
 * Liefert 7 oder 3, wenn "now" im Kalender der angegebenen Zeitzone genau
 * 7 bzw. 3 Tage vor dem Kalendertag des nächsten Vollmonds liegt, sonst null.
 * Wie überall in der App wird die Kalendertag-Zuordnung erst nach der
 * Zeitzonen-Umrechnung vorgenommen (SPEC.md §3) – dieselbe "now"-Instanz kann
 * so für zwei Zeitzonen unterschiedliche Ergebnisse liefern (Datumskipp).
 */
export function getReminderDay(now: Date, timeZone: string): ReminderDay | null {
  const today = toCalendarDate(now, timeZone);
  const fullMoonDay = toCalendarDate(nextFullMoon(now), timeZone);
  const daysUntilFullMoon = calendarDayDiff(today, fullMoonDay);
  return (REMINDER_DAYS_BEFORE as readonly number[]).includes(daysUntilFullMoon)
    ? (daysUntilFullMoon as ReminderDay)
    : null;
}

/**
 * Doppelsendungs-Schutz: true, wenn für diese Zeitzone bereits am heutigen
 * Kalendertag eine Erinnerung verschickt wurde (last_notified_at-Spalte).
 */
export function wasAlreadyNotifiedToday(now: Date, timeZone: string, lastNotifiedAt: Date | null): boolean {
  if (!lastNotifiedAt) return false;
  return toCalendarDate(lastNotifiedAt, timeZone) === toCalendarDate(now, timeZone);
}
