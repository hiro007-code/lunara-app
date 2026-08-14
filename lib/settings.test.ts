import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CRITICAL_PHASE_SETTINGS,
  clampCriticalPhaseEnd,
  clampCriticalPhaseStart,
  formatCriticalPhaseSummary,
  formatOffsetLabel,
  loadCriticalPhaseSettings,
  saveCriticalPhaseSettings,
} from "./settings";

describe("formatOffsetLabel", () => {
  it("formatiert negative Offsets als '... Tage vorher'", () => {
    expect(formatOffsetLabel(-7)).toBe("7 Tage vorher");
  });

  it("formatiert -1 im Singular", () => {
    expect(formatOffsetLabel(-1)).toBe("1 Tag vorher");
  });

  it("formatiert 0 als 'Vollmond'", () => {
    expect(formatOffsetLabel(0)).toBe("Vollmond");
  });

  it("formatiert positive Offsets als '... Tage nachher'", () => {
    expect(formatOffsetLabel(5)).toBe("5 Tage nachher");
  });

  it("formatiert +1 im Singular", () => {
    expect(formatOffsetLabel(1)).toBe("1 Tag nachher");
  });
});

describe("formatCriticalPhaseSummary", () => {
  it("formatiert den Default (-7..0), inkl. 'Vollmond'", () => {
    expect(formatCriticalPhaseSummary(-7, 0)).toBe("Kritische Phase: 7 Tage vorher – Vollmond");
  });

  it("formatiert einen Bereich, der bis nach dem Vollmond reicht, inkl. '1 Tag nachher'", () => {
    expect(formatCriticalPhaseSummary(-1, 1)).toBe("Kritische Phase: 1 Tag vorher – 1 Tag nachher");
  });

  it("formatiert eine Phase, die genau am Vollmond beginnt und endet", () => {
    expect(formatCriticalPhaseSummary(0, 0)).toBe("Kritische Phase: Vollmond – Vollmond");
  });

  it("formatiert die Extremwerte des erlaubten Bereichs", () => {
    expect(formatCriticalPhaseSummary(-10, 5)).toBe("Kritische Phase: 10 Tage vorher – 5 Tage nachher");
  });
});

describe("clampCriticalPhaseStart / clampCriticalPhaseEnd", () => {
  it("lässt gültige Werte unverändert", () => {
    expect(clampCriticalPhaseStart(-7)).toBe(-7);
    expect(clampCriticalPhaseEnd(0)).toBe(0);
  });

  it("kappt Start-Offset auf den erlaubten Bereich (-10..-1)", () => {
    expect(clampCriticalPhaseStart(-20)).toBe(-10);
    expect(clampCriticalPhaseStart(3)).toBe(-1);
  });

  it("kappt End-Offset auf den erlaubten Bereich (-3..5)", () => {
    expect(clampCriticalPhaseEnd(-9)).toBe(-3);
    expect(clampCriticalPhaseEnd(9)).toBe(5);
  });
});

describe("Phasen-Persistenz (localStorage)", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("liefert den Default (-7..0), wenn nichts gespeichert ist", () => {
    expect(loadCriticalPhaseSettings()).toEqual(DEFAULT_CRITICAL_PHASE_SETTINGS);
  });

  it("speichert und lädt eine Einstellung", () => {
    saveCriticalPhaseSettings({ startOffset: -3, endOffset: 2 });
    expect(loadCriticalPhaseSettings()).toEqual({ startOffset: -3, endOffset: 2 });
  });

  it("ignoriert kaputte/fremde Daten in localStorage und fällt auf den Default zurück", () => {
    localStorage.setItem("lunara:critical-phase", "{not valid json");
    expect(loadCriticalPhaseSettings()).toEqual(DEFAULT_CRITICAL_PHASE_SETTINGS);
  });

  it("kappt eine ungültige gespeicherte Kombination (Start nach Ende) beim Laden", () => {
    saveCriticalPhaseSettings({ startOffset: -1, endOffset: -3 });
    expect(loadCriticalPhaseSettings()).toEqual({ startOffset: -1, endOffset: -1 });
  });
});
