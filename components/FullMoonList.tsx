import { criticalPhaseDays, fullMoonsInRange } from "@/lib/moon";
import { calendarDateToUTC, formatCalendarDayRange, formatDate, formatTime, formatWeekday, shiftCalendarDate, toCalendarDate } from "@/lib/timezone";

const HORIZON_MONTHS = 18;

type FullMoonListProps = {
  now: Date;
  timeZone: string;
  startOffset: number;
  endOffset: number;
};

/** "Kritische Phase: 21.–28. Aug" */
function formatCriticalPhaseLabel(phase: string[]): string {
  return `Kritische Phase: ${formatCalendarDayRange(phase)}`;
}

function groupByYear(dates: Date[], timeZone: string): Map<string, Date[]> {
  const groups = new Map<string, Date[]>();
  for (const date of dates) {
    const year = toCalendarDate(date, timeZone).slice(0, 4);
    const group = groups.get(year);
    if (group) {
      group.push(date);
    } else {
      groups.set(year, [date]);
    }
  }
  return groups;
}

type FullMoonRowProps = {
  date: Date;
  timeZone: string;
  startOffset: number;
  endOffset: number;
  muted?: boolean;
};

function FullMoonRow({ date, timeZone, startOffset, endOffset, muted }: FullMoonRowProps) {
  const phase = criticalPhaseDays(date, timeZone, startOffset, endOffset);
  return (
    <li className={`flex flex-col gap-1 py-3 ${muted ? "opacity-40" : ""}`}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-foreground">
          {formatWeekday(date, timeZone)}, {formatDate(date, timeZone)}
        </span>
        <span className="shrink-0 text-sm text-foreground-muted">{formatTime(date, timeZone)}</span>
      </div>
      <span className="text-xs text-amber">{formatCriticalPhaseLabel(phase)}</span>
    </li>
  );
}

/** Jahresübersicht (SPEC.md §2.2a): vergangene Vollmonde des laufenden Monats (ausgegraut) oberhalb der nächsten 18 Monate. */
export function FullMoonList({ now, timeZone, startOffset, endOffset }: FullMoonListProps) {
  const today = toCalendarDate(now, timeZone);
  const monthStartDay = `${today.slice(0, 7)}-01`;

  const pastCandidates = fullMoonsInRange(calendarDateToUTC(shiftCalendarDate(monthStartDay, -1)), now);
  const pastThisMonth = pastCandidates.filter((fullMoon) => {
    const day = toCalendarDate(fullMoon, timeZone);
    return day >= monthStartDay && day <= today;
  });

  const todayAnchor = calendarDateToUTC(today);
  const horizonEnd = new Date(
    Date.UTC(todayAnchor.getUTCFullYear(), todayAnchor.getUTCMonth() + HORIZON_MONTHS, todayAnchor.getUTCDate()),
  );
  const upcoming = fullMoonsInRange(now, horizonEnd);
  const yearGroups = groupByYear(upcoming, timeZone);

  if (pastThisMonth.length === 0 && upcoming.length === 0) {
    return <p className="py-3 text-sm text-foreground-muted">Keine Vollmonde gefunden.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {pastThisMonth.length > 0 && (
        <ul className="divide-y divide-white/10">
          {pastThisMonth.map((date) => (
            <FullMoonRow
              key={date.toISOString()}
              date={date}
              timeZone={timeZone}
              startOffset={startOffset}
              endOffset={endOffset}
              muted
            />
          ))}
        </ul>
      )}

      {[...yearGroups.entries()].map(([year, dates]) => (
        <div key={year} className="flex flex-col gap-1">
          <h3 className="text-xs text-foreground-muted">{year}</h3>
          <ul className="divide-y divide-white/10">
            {dates.map((date) => (
              <FullMoonRow key={date.toISOString()} date={date} timeZone={timeZone} startOffset={startOffset} endOffset={endOffset} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
