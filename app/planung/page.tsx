"use client";

import { useEffect, useState } from "react";
import { DateCheck } from "@/components/DateCheck";
import { FullMoonList } from "@/components/FullMoonList";
import { useTimezone } from "@/components/TimezoneProvider";

export default function PlanungPage() {
  const { timezone } = useTimezone();

  // Wie im Countdown-Screen: Berechnung erst nach dem Mount, damit kein zur
  // Build-Zeit eingefrorener Zeitpunkt als veraltete Jahresübersicht aufblitzt.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  return (
    <div className="stars-bg flex flex-1 flex-col gap-10 py-10">
      <section className="flex flex-col gap-4">
        <h2 className="text-xs tracking-wide text-foreground-muted uppercase">Datums-Check</h2>
        <DateCheck timeZone={timezone} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs tracking-wide text-foreground-muted uppercase">Vollmonde</h2>
        {now && (
          <div className="animate-fade-in">
            <FullMoonList now={now} timeZone={timezone} />
          </div>
        )}
      </section>
    </div>
  );
}
