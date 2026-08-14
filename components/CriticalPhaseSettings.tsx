"use client";

import { useState } from "react";
import { useCriticalPhase } from "@/components/CriticalPhaseProvider";
import {
  CRITICAL_PHASE_END_MAX,
  CRITICAL_PHASE_END_MIN,
  CRITICAL_PHASE_START_MAX,
  CRITICAL_PHASE_START_MIN,
  formatCriticalPhaseSummary,
  formatOffsetLabel,
} from "@/lib/settings";

const PANEL_ID = "critical-phase-settings-panel";

function range(min: number, max: number): number[] {
  const values: number[] = [];
  for (let value = min; value <= max; value++) values.push(value);
  return values;
}

const START_OPTIONS = range(CRITICAL_PHASE_START_MIN, CRITICAL_PHASE_START_MAX);
const END_OPTIONS = range(CRITICAL_PHASE_END_MIN, CRITICAL_PHASE_END_MAX);

const SELECT_CLASSNAME =
  "focus-ring [color-scheme:dark] rounded-md border border-white/10 bg-transparent px-2 py-1.5 text-sm text-foreground";

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-3.5 w-3.5 shrink-0 text-foreground-muted transition-transform motion-reduce:transition-none ${
        expanded ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
    </svg>
  );
}

/**
 * Zusammengeklappte Einstellungs-Zeile oberhalb der Jahresübersicht (SPEC.md §2.2).
 * Der Auf-/Zu-Zustand ist reiner, flüchtiger UI-State (kein localStorage) – die
 * Phasen-Einstellung selbst bleibt über CriticalPhaseProvider persistent.
 */
export function CriticalPhaseSettings() {
  const { startOffset, endOffset, setStartOffset, setEndOffset } = useCriticalPhase();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        aria-controls={PANEL_ID}
        className="focus-ring flex items-center justify-between gap-2 py-1 text-left text-xs tracking-wide text-foreground-muted uppercase"
      >
        <span>{formatCriticalPhaseSummary(startOffset, endOffset)}</span>
        <ChevronIcon expanded={expanded} />
      </button>

      <div
        id={PANEL_ID}
        className={`grid overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none ${
          expanded ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 overflow-hidden text-sm text-foreground-muted">
          <span>von</span>
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
      </div>
    </div>
  );
}
