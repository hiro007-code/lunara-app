"use client";

import { useMemo, useState } from "react";
import { checkDateRange, criticalPhaseDays } from "@/lib/moon";
import { calendarDateToUTC, formatCalendarDayRange, formatDate, formatWeekday } from "@/lib/timezone";

type DateCheckProps = {
  timeZone: string;
  startOffset: number;
  endOffset: number;
};

/** Formatiert einen bereits zeitzonen-aufgelösten Kalendertag (YYYY-MM-DD) als "Wochentag, Datum". */
function formatFullMoonLabel(isoDate: string): string {
  const anchor = calendarDateToUTC(isoDate);
  return `${formatWeekday(anchor, "UTC")}, ${formatDate(anchor, "UTC")}`;
}

/** Reise-Ampel (SPEC.md §2.2b). Kein <form>-Element, Berechnung automatisch bei vollständiger Eingabe. */
export function DateCheck({ timeZone, startOffset, endOffset }: DateCheckProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const error = startDate && endDate && endDate < startDate ? "Enddatum darf nicht vor dem Startdatum liegen." : null;

  const result = useMemo(() => {
    if (!startDate || !endDate || error) return null;
    return checkDateRange(startDate, endDate, timeZone, startOffset, endOffset);
  }, [startDate, endDate, timeZone, startOffset, endOffset, error]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm text-foreground-muted">
          Start
          <input
            type="date"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="focus-ring [color-scheme:dark] rounded-md border border-white/10 bg-transparent px-3 py-2 text-foreground"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-foreground-muted">
          Ende
          <input
            type="date"
            required
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="focus-ring [color-scheme:dark] rounded-md border border-white/10 bg-transparent px-3 py-2 text-foreground"
          />
        </label>
      </div>

      {error && <p className="text-sm text-foreground-muted">{error}</p>}

      {result && result.status === "free" && (
        <div className="flex items-center gap-2 rounded-md border border-white/10 p-4">
          <span className="h-2.5 w-2.5 rounded-full bg-green" />
          <span className="text-sm text-green">Keine Überschneidung mit einer kritischen Phase.</span>
        </div>
      )}

      {result && result.status === "critical" && (
        <div className="flex flex-col gap-2 rounded-md border border-white/10 p-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-danger" />
            <span className="text-sm font-medium text-danger">
              {result.overlapDays.length} von {result.totalTripDays} Reisetagen in der kritischen Phase
            </span>
          </div>
          <ul className="flex flex-col gap-1 text-sm text-foreground">
            {result.fullMoonDates.map((fullMoonDay) => {
              const phase = criticalPhaseDays(calendarDateToUTC(fullMoonDay), "UTC", startOffset, endOffset);
              const overlapForThisMoon = phase.filter((day) => result.overlapDays.includes(day));
              return (
                <li key={fullMoonDay}>
                  {formatCalendarDayRange(overlapForThisMoon)}, Vollmond am {formatFullMoonLabel(fullMoonDay)}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
