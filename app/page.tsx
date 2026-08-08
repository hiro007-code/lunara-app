"use client";

import { useEffect, useState } from "react";
import { Countdown } from "@/components/Countdown";
import { Moon } from "@/components/Moon";
import { useTimezone } from "@/components/TimezoneProvider";
import { moonIllumination, nextFullMoon, previousFullMoon } from "@/lib/moon";

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
  const { timezone } = useTimezone();

  // Berechnung erst nach dem Mount (Client-only), damit der statisch
  // vorgerenderte Build-Zeitpunkt nicht als veralteter Wert aufblitzt.
  const [state, setState] = useState<MoonState | null>(null);

  useEffect(() => {
    setState(computeMoonState());
  }, []);

  return (
    <div className="stars-bg flex flex-1 flex-col items-center justify-center gap-10 py-10">
      {state && (
        <div className="animate-fade-in flex flex-col items-center gap-10">
          <Moon fraction={state.fraction} waxing={state.waxing} />
          <Countdown now={state.now} nextFullMoon={state.next} previousFullMoon={state.previous} timeZone={timezone} />
        </div>
      )}
    </div>
  );
}
