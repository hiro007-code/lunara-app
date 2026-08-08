"use client";

import { useState } from "react";
import { TimezonePicker } from "@/components/TimezonePicker";
import { useTimezone } from "@/components/TimezoneProvider";
import { getTimezoneLabel } from "@/lib/timezone";

/** Dezentes, antippbares Zeitzonen-Label oben rechts (SPEC.md §2.1, §5.4) – öffnet den TimezonePicker. */
export function TimezoneLabel() {
  const { timezone } = useTimezone();
  const [open, setOpen] = useState(false);
  const { city } = getTimezoneLabel(timezone);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="focus-ring text-sm text-foreground-muted">
        {city}
      </button>
      {open && <TimezonePicker onClose={() => setOpen(false)} />}
    </>
  );
}
