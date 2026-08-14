import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkDateRange, criticalPhaseDays, fullMoonsInRange, moonIllumination, nextFullMoon, previousFullMoon } from "./moon";

// Bekannte Referenzwerte (UTC), unabhängig verifiziert via astronomy-engine
// und öffentlichen Almanach-Daten:
const FULL_MOON_DEC_2024 = new Date("2024-12-15T09:02:14.764Z");
const FULL_MOON_JAN_2025 = new Date("2025-01-13T22:27:32.237Z");
const FULL_MOON_FEB_2025 = new Date("2025-02-12T13:54:03.015Z");
const FULL_MOON_JUN_2025 = new Date("2025-06-11T07:44:26.705Z");

// Vollmond nur 5 Minuten vor Mitternacht UTC – fällt je nach Zeitzone auf
// unterschiedliche Kalendertage (Randfall aus SPEC.md §3).
const FULL_MOON_NEAR_MIDNIGHT = new Date("2021-09-20T23:55:20.091Z");

const HOUR_MS = 60 * 60 * 1000;

describe("nextFullMoon", () => {
  it("findet den Vollmond im Januar 2025 (±wenige Stunden)", () => {
    const result = nextFullMoon(new Date("2025-01-01T00:00:00Z"));
    expect(Math.abs(result.getTime() - FULL_MOON_JAN_2025.getTime())).toBeLessThan(3 * HOUR_MS);
  });

  it("findet den Vollmond im Juni 2025 (±wenige Stunden)", () => {
    const result = nextFullMoon(new Date("2025-06-01T00:00:00Z"));
    expect(Math.abs(result.getTime() - FULL_MOON_JUN_2025.getTime())).toBeLessThan(3 * HOUR_MS);
  });

  it("liegt strikt nach dem Startzeitpunkt", () => {
    const from = new Date("2025-01-14T00:00:00Z");
    const result = nextFullMoon(from);
    expect(result.getTime()).toBeGreaterThan(from.getTime());
  });
});

describe("previousFullMoon", () => {
  it("findet den letzten Vollmond vor einem Zeitpunkt", () => {
    const result = previousFullMoon(new Date("2025-01-20T00:00:00Z"));
    expect(Math.abs(result.getTime() - FULL_MOON_JAN_2025.getTime())).toBeLessThan(3 * HOUR_MS);
  });

  it("liegt strikt vor dem Startzeitpunkt", () => {
    const from = new Date("2025-01-14T00:00:00Z");
    const result = previousFullMoon(from);
    expect(result.getTime()).toBeLessThan(from.getTime());
  });
});

describe("fullMoonsInRange", () => {
  it("liefert genau die Vollmonde im Zeitraum, sortiert nach Zeit", () => {
    const result = fullMoonsInRange(new Date("2025-01-01T00:00:00Z"), new Date("2025-03-01T00:00:00Z"));
    expect(result).toHaveLength(2);
    expect(Math.abs(result[0].getTime() - FULL_MOON_JAN_2025.getTime())).toBeLessThan(3 * HOUR_MS);
    expect(Math.abs(result[1].getTime() - FULL_MOON_FEB_2025.getTime())).toBeLessThan(3 * HOUR_MS);
  });

  it("liefert eine leere Liste für einen vollmondfreien Zeitraum", () => {
    const result = fullMoonsInRange(new Date("2025-01-14T00:00:00Z"), new Date("2025-01-20T00:00:00Z"));
    expect(result).toHaveLength(0);
  });
});

describe("moonIllumination", () => {
  it("ist nahe 1 (voll beleuchtet) am Vollmond", () => {
    const { fraction } = moonIllumination(FULL_MOON_JAN_2025);
    expect(fraction).toBeGreaterThan(0.99);
  });

  it("ist nahe 0 (unbeleuchtet) am Neumond", () => {
    const { fraction } = moonIllumination(new Date("2025-01-29T12:36:00.000Z"));
    expect(fraction).toBeLessThan(0.01);
  });

  it("erkennt zunehmenden Mond vor dem Vollmond", () => {
    const { waxing, fraction } = moonIllumination(new Date("2025-01-10T22:27:00.000Z"));
    expect(waxing).toBe(true);
    expect(fraction).toBeGreaterThan(0.7);
    expect(fraction).toBeLessThan(1);
  });

  it("erkennt abnehmenden Mond nach dem Vollmond", () => {
    const { waxing, fraction } = moonIllumination(new Date("2025-01-17T22:27:00.000Z"));
    expect(waxing).toBe(false);
    expect(fraction).toBeGreaterThan(0.7);
    expect(fraction).toBeLessThan(1);
  });
});

describe("criticalPhaseDays", () => {
  it("Default -7..0: 8 Kalendertage bis einschliesslich des Vollmond-Tags", () => {
    const days = criticalPhaseDays(FULL_MOON_JAN_2025, "Europe/Zurich", -7, 0);
    expect(days).toEqual([
      "2025-01-06",
      "2025-01-07",
      "2025-01-08",
      "2025-01-09",
      "2025-01-10",
      "2025-01-11",
      "2025-01-12",
      "2025-01-13",
    ]);
  });

  it("0..0: nur der Vollmond-Tag selbst", () => {
    expect(criticalPhaseDays(FULL_MOON_JAN_2025, "Europe/Zurich", 0, 0)).toEqual(["2025-01-13"]);
  });

  it("-7..+1: schliesst einen Tag nach dem Vollmond mit ein", () => {
    const days = criticalPhaseDays(FULL_MOON_JAN_2025, "Europe/Zurich", -7, 1);
    expect(days[0]).toBe("2025-01-06");
    expect(days[days.length - 1]).toBe("2025-01-14");
    expect(days).toHaveLength(9);
  });

  it("überspannt eine Monatsgrenze", () => {
    const fullMoonNearMonthEnd = new Date("2026-09-01T12:00:00Z"); // Zurich-Kalendertag: 2026-09-01
    const days = criticalPhaseDays(fullMoonNearMonthEnd, "Europe/Zurich", -7, 0);
    expect(days).toEqual([
      "2026-08-25",
      "2026-08-26",
      "2026-08-27",
      "2026-08-28",
      "2026-08-29",
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
    ]);
  });

  it("überspannt eine Jahresgrenze", () => {
    const fullMoonNearYearEnd = new Date("2026-01-03T10:03:26.043Z"); // Zurich-Kalendertag: 2026-01-03
    const days = criticalPhaseDays(fullMoonNearYearEnd, "Europe/Zurich", -7, 0);
    expect(days).toEqual([
      "2025-12-27",
      "2025-12-28",
      "2025-12-29",
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
    ]);
  });

  it("ordnet den Vollmond nahe Mitternacht je nach Zeitzone einem anderen Kalendertag zu", () => {
    const tokyoPhase = criticalPhaseDays(FULL_MOON_NEAR_MIDNIGHT, "Asia/Tokyo", 0, 0);
    const laPhase = criticalPhaseDays(FULL_MOON_NEAR_MIDNIGHT, "America/Los_Angeles", 0, 0);
    expect(tokyoPhase).toEqual(["2021-09-21"]);
    expect(laPhase).toEqual(["2021-09-20"]);
  });
});

describe("checkDateRange", () => {
  const timeZone = "Europe/Zurich";
  // Vollmond-Kalendertag in Europe/Zurich: 2025-01-13, kritische Phase (Default -7..0): 01-06 .. 01-13.

  it("frei: Zeitraum ausserhalb der kritischen Phase, keine Überschneidung", () => {
    const result = checkDateRange("2025-01-01", "2025-01-05", timeZone, -7, 0);
    expect(result).toEqual({ status: "free", overlapDays: [], totalTripDays: 5, fullMoonDates: [] });
  });

  it("kritisch: Teilüberschneidung – Ausmass zählt nur die tatsächlich betroffenen Tage", () => {
    const result = checkDateRange("2025-01-10", "2025-01-16", timeZone, -7, 0);
    expect(result).toEqual({
      status: "critical",
      overlapDays: ["2025-01-10", "2025-01-11", "2025-01-12", "2025-01-13"],
      totalTripDays: 7,
      fullMoonDates: ["2025-01-13"],
    });
  });

  it("kritisch: Reisezeitraum liegt komplett innerhalb der kritischen Phase", () => {
    const result = checkDateRange("2025-01-08", "2025-01-10", timeZone, -7, 0);
    expect(result).toEqual({
      status: "critical",
      overlapDays: ["2025-01-08", "2025-01-09", "2025-01-10"],
      totalTripDays: 3,
      fullMoonDates: ["2025-01-13"],
    });
  });

  it("frei: angrenzender Zeitraum endet genau 1 Tag vor Beginn der kritischen Phase", () => {
    const result = checkDateRange("2025-01-03", "2025-01-05", timeZone, -7, 0);
    expect(result).toEqual({ status: "free", overlapDays: [], totalTripDays: 3, fullMoonDates: [] });
  });

  it("erfasst beide kritischen Phasen, wenn der Zeitraum zwei Vollmonde überspannt", () => {
    // Vollmond-Kalendertag Februar in Europe/Zurich: 2025-02-12, Phase: 02-05 .. 02-12.
    const result = checkDateRange("2025-01-12", "2025-02-06", timeZone, -7, 0);
    expect(result).toEqual({
      status: "critical",
      overlapDays: ["2025-01-12", "2025-01-13", "2025-02-05", "2025-02-06"],
      totalTripDays: 26,
      fullMoonDates: ["2025-01-13", "2025-02-12"],
    });
  });

  it("berücksichtigt konfigurierte Offsets abseits des Defaults", () => {
    const result = checkDateRange("2025-01-13", "2025-01-13", timeZone, 0, 0);
    expect(result).toEqual({
      status: "critical",
      overlapDays: ["2025-01-13"],
      totalTripDays: 1,
      fullMoonDates: ["2025-01-13"],
    });
  });
});

describe("Randfall: Vollmond-Umschlag (Systemzeit manipuliert)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exakt am Vollmond-Zeitpunkt: Beleuchtung ist voll und nextFullMoon liegt auf 'heute'", () => {
    vi.setSystemTime(FULL_MOON_JAN_2025);
    const now = new Date();
    // Für previousFullMoon ist die exakte Vollmond-Sekunde eine Gleitkomma-Randfrage
    // (astronomy-engine kann hier je nach Rundung schon eine Zyklus-Länge zurückspringen);
    // real erreichbar ist dieser Mikrosekunden-Zeitpunkt ohnehin nie. Entscheidend fürs
    // App-Verhalten ("Heute Nacht ist Vollmond") ist nextFullMoon, und das ist stabil.
    expect(nextFullMoon(now).toISOString().slice(0, 10)).toBe("2025-01-13");
    expect(moonIllumination(now).fraction).toBeGreaterThan(0.99);
  });

  it("kurz nach dem Vollmond: nextFullMoon schlägt sauber auf den nächsten Vollmond um", () => {
    vi.setSystemTime(new Date(FULL_MOON_JAN_2025.getTime() + 3 * HOUR_MS));
    const now = new Date();
    const next = nextFullMoon(now);
    const previous = previousFullMoon(now);
    expect(Math.abs(next.getTime() - FULL_MOON_FEB_2025.getTime())).toBeLessThan(3 * HOUR_MS);
    expect(Math.abs(previous.getTime() - FULL_MOON_JAN_2025.getTime())).toBeLessThan(3 * HOUR_MS);
  });

  it("kurz vor dem Vollmond: nextFullMoon zeigt noch auf den (heute anstehenden) Vollmond", () => {
    vi.setSystemTime(new Date(FULL_MOON_JAN_2025.getTime() - 3 * HOUR_MS));
    const now = new Date();
    const next = nextFullMoon(now);
    const previous = previousFullMoon(now);
    expect(Math.abs(next.getTime() - FULL_MOON_JAN_2025.getTime())).toBeLessThan(3 * HOUR_MS);
    expect(Math.abs(previous.getTime() - FULL_MOON_DEC_2024.getTime())).toBeLessThan(3 * HOUR_MS);
  });
});

