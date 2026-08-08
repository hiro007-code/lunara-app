"use client";

import { useMemo, useState } from "react";
import { checkDateRange } from "@/lib/moon";
import { calendarDateToUTC, formatDate, formatWeekday } from "@/lib/timezone";

type Status = "green" | "yellow" | "red";

type DateCheckProps = {
  timeZone: string;
};

const STATUS_CONFIG: Record<Status, { label: string; dot: string; text: string; message: string }> = {
  green: {
    label: "Grün",
    dot: "bg-green",
    text: "text-green",
    message: "Kein Vollmond und keine Gefahrenzone in diesem Zeitraum.",
  },
  yellow: {
    label: "Gelb",
    dot: "bg-amber",
    text: "text-amber",
    message: "Die Gefahrenzone (±2 Tage) berührt diesen Zeitraum.",
  },
  red: {
    label: "Rot",
    dot: "bg-danger",
    text: "text-danger",
    message: "Ein Vollmond-Tag liegt in diesem Zeitraum.",
  },
};

/** Formatiert einen bereits zeitzonen-aufgelösten Kalendertag (YYYY-MM-DD) als "Wochentag, Datum". */
function formatFullMoonLabel(isoDate: string): string {
  const anchor = calendarDateToUTC(isoDate);
  return `${formatWeekday(anchor, "UTC")}, ${formatDate(anchor, "UTC")}`;
}

/** Reise-Ampel (SPEC.md §2.2b). Kein <form>-Element, Berechnung automatisch bei vollständiger Eingabe. */
export function DateCheck({ timeZone }: DateCheckProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const error = startDate && endDate && endDate < startDate ? "Enddatum darf nicht vor dem Startdatum liegen." : null;

  const result = useMemo(() => {
    if (!startDate || !endDate || error) return null;
    return checkDateRange(startDate, endDate, timeZone);
  }, [startDate, endDate, timeZone, error]);

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

      {result && (
        <div className="flex flex-col gap-2 rounded-md border border-white/10 p-4">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_CONFIG[result.status].dot}`} />
            <span className={`text-sm font-medium ${STATUS_CONFIG[result.status].text}`}>
              {STATUS_CONFIG[result.status].label}
            </span>
          </div>
          <p className="text-sm text-foreground-muted">{STATUS_CONFIG[result.status].message}</p>
          {result.fullMoonDates.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-foreground">
              {result.fullMoonDates.map((date) => (
                <li key={date}>Vollmond am {formatFullMoonLabel(date)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
