// Einstellung "Kritische Phase" (SPEC.md §2.2): Fenster relativ zum Vollmond,
// pro Gerät konfigurierbar. Persistenz via localStorage, analog lib/timezone.ts.

export const CRITICAL_PHASE_START_MIN = -10;
export const CRITICAL_PHASE_START_MAX = -1;
export const CRITICAL_PHASE_END_MIN = -3;
export const CRITICAL_PHASE_END_MAX = 5;

export const DEFAULT_CRITICAL_PHASE_START_OFFSET = -7;
export const DEFAULT_CRITICAL_PHASE_END_OFFSET = 0;

const CRITICAL_PHASE_STORAGE_KEY = "lunara:critical-phase";

export type CriticalPhaseSettings = {
  startOffset: number;
  endOffset: number;
};

export const DEFAULT_CRITICAL_PHASE_SETTINGS: CriticalPhaseSettings = {
  startOffset: DEFAULT_CRITICAL_PHASE_START_OFFSET,
  endOffset: DEFAULT_CRITICAL_PHASE_END_OFFSET,
};

export function clampCriticalPhaseStart(value: number): number {
  return Math.min(Math.max(value, CRITICAL_PHASE_START_MIN), CRITICAL_PHASE_START_MAX);
}

export function clampCriticalPhaseEnd(value: number): number {
  return Math.min(Math.max(value, CRITICAL_PHASE_END_MIN), CRITICAL_PHASE_END_MAX);
}

/** Klartext-Label für einen Tages-Offset relativ zum Vollmond, z. B. "7 Tage vorher", "Vollmond", "1 Tag nachher". */
export function formatOffsetLabel(offset: number): string {
  if (offset === 0) return "Vollmond";
  const days = Math.abs(offset);
  const unit = days === 1 ? "Tag" : "Tage";
  return offset < 0 ? `${days} ${unit} vorher` : `${days} ${unit} nachher`;
}

/** Kompakte Zusammenfassung für die zusammengeklappte Einstellungs-Zeile, z. B. "Kritische Phase: 7 Tage vorher – Vollmond". */
export function formatCriticalPhaseSummary(startOffset: number, endOffset: number): string {
  return `Kritische Phase: ${formatOffsetLabel(startOffset)} – ${formatOffsetLabel(endOffset)}`;
}

function isLocalStorageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}

/** Phasen-Einstellung aus localStorage – SSR-sicher (liefert den Default ausserhalb des Browsers). */
export function loadCriticalPhaseSettings(): CriticalPhaseSettings {
  if (!isLocalStorageAvailable()) return DEFAULT_CRITICAL_PHASE_SETTINGS;
  try {
    const raw = localStorage.getItem(CRITICAL_PHASE_STORAGE_KEY);
    if (!raw) return DEFAULT_CRITICAL_PHASE_SETTINGS;

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Partial<CriticalPhaseSettings>).startOffset !== "number" ||
      typeof (parsed as Partial<CriticalPhaseSettings>).endOffset !== "number"
    ) {
      return DEFAULT_CRITICAL_PHASE_SETTINGS;
    }

    const startOffset = clampCriticalPhaseStart((parsed as CriticalPhaseSettings).startOffset);
    const endOffset = Math.max(clampCriticalPhaseEnd((parsed as CriticalPhaseSettings).endOffset), startOffset);
    return { startOffset, endOffset };
  } catch {
    return DEFAULT_CRITICAL_PHASE_SETTINGS;
  }
}

export function saveCriticalPhaseSettings(settings: CriticalPhaseSettings): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(CRITICAL_PHASE_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage kann z. B. im privaten Modus nicht verfügbar sein – Einstellung bleibt dann nur für die Sitzung aktiv.
  }
}
