"use client";

import { useEffect, useState } from "react";
import { Countdown } from "@/components/Countdown";
import { Moon } from "@/components/Moon";
import { moonIllumination, nextFullMoon, previousFullMoon } from "@/lib/moon";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";

// Zeitzonen-Picker folgt in Etappe 5 (SPEC.md §2.3) – vorerst fixe Zeitzone.
const TIMEZONE = DEFAULT_TIMEZONE;
const TIMEZONE_LABEL = "Zürich";

type MoonState = {
  now: Date;
  next: Date;
  previous: Date;
  fraction: number;
  waxing: boolean;
};

function computeMoonState(): MoonState {
  const now = new Date();
  const { fraction, waxing } = moonIllumination(now);
  return {
    now,
    next: nextFullMoon(now),
    previous: previousFullMoon(now),
    fraction,
    waxing,
  };
}

export default function MoonPage() {
  // Berechnung erst nach dem Mount (Client-only), damit der statisch
  // vorgerenderte Build-Zeitpunkt nicht als veralteter Wert aufblitzt.
  const [state, setState] = useState<MoonState | null>(null);

  useEffect(() => {
    setState(computeMoonState());
  }, []);

  return (
    <div className="stars-bg relative flex min-h-[calc(100vh-4rem)] flex-col px-6 pt-6 pb-10">
      <div className="flex justify-end">
        <span className="text-sm text-foreground-muted">{TIMEZONE_LABEL}</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        {state && (
          <div className="animate-fade-in flex flex-col items-center gap-10">
            <Moon fraction={state.fraction} waxing={state.waxing} />
            <Countdown now={state.now} nextFullMoon={state.next} previousFullMoon={state.previous} timeZone={TIMEZONE} />
          </div>
        )}
      </div>
    </div>
  );
}
