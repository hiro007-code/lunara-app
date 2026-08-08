"use client";

import { useEffect, useState } from "react";
import { DateCheck } from "@/components/DateCheck";
import { FullMoonList } from "@/components/FullMoonList";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";

// Zeitzonen-Picker folgt in Etappe 5 (SPEC.md §2.3) – vorerst fixe Zeitzone.
const TIMEZONE = DEFAULT_TIMEZONE;

export default function PlanungPage() {
  // Wie im Countdown-Screen: Berechnung erst nach dem Mount, damit kein zur
  // Build-Zeit eingefrorener Zeitpunkt als veraltete Jahresübersicht aufblitzt.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  return (
    <div className="stars-bg flex min-h-[calc(100vh-4rem)] flex-col gap-10 px-6 pt-6 pb-10">
      <section className="flex flex-col gap-4">
        <h2 className="text-xs tracking-wide text-foreground-muted uppercase">Datums-Check</h2>
        <DateCheck timeZone={TIMEZONE} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs tracking-wide text-foreground-muted uppercase">Vollmonde</h2>
        {now && (
          <div className="animate-fade-in">
            <FullMoonList now={now} timeZone={TIMEZONE} />
          </div>
        )}
      </section>
    </div>
  );
}
