import { calendarDayDiff, toCalendarDate } from "@/lib/timezone";

const MS_PER_HOUR = 60 * 60 * 1000;
const HOURS_THRESHOLD = 48;

type CountdownProps = {
  now: Date;
  nextFullMoon: Date;
  previousFullMoon: Date;
  timeZone: string;
};

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/** Countdown-Texte (SPEC.md §2.1). Tages-Differenzen als Kalendertag-Differenz in der aktiven Zeitzone. */
export function Countdown({ now, nextFullMoon, previousFullMoon, timeZone }: CountdownProps) {
  const today = toCalendarDate(now, timeZone);
  const nextDay = toCalendarDate(nextFullMoon, timeZone);
  const previousDay = toCalendarDate(previousFullMoon, timeZone);

  const hoursUntilNext = (nextFullMoon.getTime() - now.getTime()) / MS_PER_HOUR;
  const daysSincePrevious = calendarDayDiff(previousDay, today);

  let primaryText: string;
  if (nextDay === today) {
    primaryText = "Heute Nacht ist Vollmond";
  } else if (hoursUntilNext < HOURS_THRESHOLD) {
    const hours = Math.max(1, Math.round(hoursUntilNext));
    primaryText = `Vollmond in ${hours} ${pluralize(hours, "Stunde", "Stunden")}`;
  } else {
    const days = calendarDayDiff(today, nextDay);
    primaryText = `Vollmond in ${days} ${pluralize(days, "Tag", "Tagen")}`;
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{primaryText}</p>
      <p className="text-sm text-foreground-muted">
        Letzter Vollmond vor {daysSincePrevious} {pluralize(daysSincePrevious, "Tag", "Tagen")}
      </p>
    </div>
  );
}
