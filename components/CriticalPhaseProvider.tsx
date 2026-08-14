"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  DEFAULT_CRITICAL_PHASE_SETTINGS,
  clampCriticalPhaseEnd,
  clampCriticalPhaseStart,
  loadCriticalPhaseSettings,
  saveCriticalPhaseSettings,
} from "@/lib/settings";

type CriticalPhaseContextValue = {
  startOffset: number;
  endOffset: number;
  setStartOffset: (value: number) => void;
  setEndOffset: (value: number) => void;
};

const CriticalPhaseContext = createContext<CriticalPhaseContextValue | null>(null);

/**
 * Globale Einstellung "Kritische Phase" (SPEC.md §2.2). Startet mit dem
 * Default, damit Server- und erster Client-Render übereinstimmen; die
 * persistierte Auswahl wird erst nach dem Mount aus localStorage nachgeladen
 * (kein Hydration-Fehler). Ungültige Start/End-Kombinationen werden durch
 * Anpassen des jeweils anderen Werts verhindert statt per Fehlermeldung.
 */
export function CriticalPhaseProvider({ children }: { children: ReactNode }) {
  const [startOffset, setStartOffsetState] = useState(DEFAULT_CRITICAL_PHASE_SETTINGS.startOffset);
  const [endOffset, setEndOffsetState] = useState(DEFAULT_CRITICAL_PHASE_SETTINGS.endOffset);

  useEffect(() => {
    const stored = loadCriticalPhaseSettings();
    setStartOffsetState(stored.startOffset);
    setEndOffsetState(stored.endOffset);
  }, []);

  function setStartOffset(value: number) {
    const nextStart = clampCriticalPhaseStart(value);
    setStartOffsetState(nextStart);
    setEndOffsetState((currentEnd) => {
      const nextEnd = nextStart > currentEnd ? nextStart : currentEnd;
      saveCriticalPhaseSettings({ startOffset: nextStart, endOffset: nextEnd });
      return nextEnd;
    });
  }

  function setEndOffset(value: number) {
    const nextEnd = clampCriticalPhaseEnd(value);
    setEndOffsetState(nextEnd);
    setStartOffsetState((currentStart) => {
      const nextStart = nextEnd < currentStart ? nextEnd : currentStart;
      saveCriticalPhaseSettings({ startOffset: nextStart, endOffset: nextEnd });
      return nextStart;
    });
  }

  return (
    <CriticalPhaseContext.Provider value={{ startOffset, endOffset, setStartOffset, setEndOffset }}>
      {children}
    </CriticalPhaseContext.Provider>
  );
}

export function useCriticalPhase(): CriticalPhaseContextValue {
  const context = useContext(CriticalPhaseContext);
  if (!context) {
    throw new Error("useCriticalPhase muss innerhalb von CriticalPhaseProvider verwendet werden.");
  }
  return context;
}
