"use client";

import { useCriticalPhase } from "@/components/CriticalPhaseProvider";
import {
  CRITICAL_PHASE_END_MAX,
  CRITICAL_PHASE_END_MIN,
  CRITICAL_PHASE_START_MAX,
  CRITICAL_PHASE_START_MIN,
  formatOffsetLabel,
} from "@/lib/settings";

function range(min: number, max: number): number[] {
  const values: number[] = [];
  for (let value = min; value <= max; value++) values.push(value);
  return values;
}

const START_OPTIONS = range(CRITICAL_PHASE_START_MIN, CRITICAL_PHASE_START_MAX);
const END_OPTIONS = range(CRITICAL_PHASE_END_MIN, CRITICAL_PHASE_END_MAX);

const SELECT_CLASSNAME =
  "focus-ring [color-scheme:dark] rounded-md border border-white/10 bg-transparent px-2 py-1.5 text-sm text-foreground";

/** Dezente Einstellungs-Zeile oberhalb der Jahresübersicht (SPEC.md §2.2). */
export function CriticalPhaseSettings() {
  const { startOffset, endOffset, setStartOffset, setEndOffset } = useCriticalPhase();

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-foreground-muted">
      <span>Kritische Phase: von</span>
      <select
        value={startOffset}
        onChange={(event) => setStartOffset(Number(event.target.value))}
        className={SELECT_CLASSNAME}
        aria-label="Beginn der kritischen Phase"
      >
        {START_OPTIONS.map((offset) => (
          <option key={offset} value={offset}>
            {formatOffsetLabel(offset)}
          </option>
        ))}
      </select>
      <span>bis</span>
      <select
        value={endOffset}
        onChange={(event) => setEndOffset(Number(event.target.value))}
        className={SELECT_CLASSNAME}
        aria-label="Ende der kritischen Phase"
      >
        {END_OPTIONS.map((offset) => (
          <option key={offset} value={offset}>
            {formatOffsetLabel(offset)}
          </option>
        ))}
      </select>
    </div>
  );
}
