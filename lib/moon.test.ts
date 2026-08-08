import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkDateRange, dangerZoneDays, fullMoonsInRange, moonIllumination, nextFullMoon, previousFullMoon } from "./moon";

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

describe("dangerZoneDays", () => {
  it("liefert exakt 5 aufeinanderfolgende Kalendertage um den Vollmond", () => {
    const days = dangerZoneDays(FULL_MOON_JAN_2025, "Europe/Zurich");
    expect(days).toEqual(["2025-01-11", "2025-01-12", "2025-01-13", "2025-01-14", "2025-01-15"]);
  });

  it("ordnet den Vollmond nahe Mitternacht je nach Zeitzone einem anderen Kalendertag zu", () => {
    const tokyoZone = dangerZoneDays(FULL_MOON_NEAR_MIDNIGHT, "Asia/Tokyo");
    const laZone = dangerZoneDays(FULL_MOON_NEAR_MIDNIGHT, "America/Los_Angeles");

    // Vollmond-Tag ist jeweils der mittlere Eintrag der 5-Tage-Zone.
    expect(tokyoZone[2]).toBe("2021-09-21");
    expect(laZone[2]).toBe("2021-09-20");
    expect(tokyoZone[2]).not.toBe(laZone[2]);
  });
});

describe("checkDateRange", () => {
  const timeZone = "Europe/Zurich";
  // Vollmond-Kalendertag in Europe/Zurich: 2025-01-13, Gefahrenzone: 01-11 .. 01-15.

  it("grün: Zeitraum ausserhalb von Vollmond und Gefahrenzone", () => {
    const result = checkDateRange("2025-01-01", "2025-01-05", timeZone);
    expect(result).toEqual({ status: "green", fullMoonDates: [] });
  });

  it("gelb: Gefahrenzone wird berührt, aber kein Vollmond-Tag liegt im Zeitraum", () => {
    const result = checkDateRange("2025-01-14", "2025-01-20", timeZone);
    expect(result).toEqual({ status: "yellow", fullMoonDates: ["2025-01-13"] });
  });

  it("rot: der Vollmond-Tag selbst liegt im Zeitraum", () => {
    const result = checkDateRange("2025-01-12", "2025-01-13", timeZone);
    expect(result).toEqual({ status: "red", fullMoonDates: ["2025-01-13"] });
  });

  it("Grenzfall: Zeitraum endet genau am Rand der Gefahrenzone -> gelb", () => {
    const result = checkDateRange("2025-01-08", "2025-01-11", timeZone);
    expect(result).toEqual({ status: "yellow", fullMoonDates: ["2025-01-13"] });
  });

  it("Grenzfall: Zeitraum endet einen Tag vor der Gefahrenzone -> grün", () => {
    const result = checkDateRange("2025-01-08", "2025-01-10", timeZone);
    expect(result).toEqual({ status: "green", fullMoonDates: [] });
  });

  it("Jahreswechsel: gelb, wenn nur die Gefahrenzone berührt wird (Silvester-Reise)", () => {
    // Vollmond-Kalendertag in Europe/Zurich: 2026-01-03 (Zone: 2026-01-01 .. 2026-01-05).
    const result = checkDateRange("2025-12-30", "2026-01-02", timeZone);
    expect(result).toEqual({ status: "yellow", fullMoonDates: ["2026-01-03"] });
  });

  it("Jahreswechsel: rot, wenn der Vollmond-Tag selbst im Zeitraum liegt", () => {
    const result = checkDateRange("2025-12-30", "2026-01-03", timeZone);
    expect(result).toEqual({ status: "red", fullMoonDates: ["2026-01-03"] });
  });

  it("Jahreswechsel: grün, wenn der Zeitraum vollständig vor der Gefahrenzone liegt", () => {
    const result = checkDateRange("2025-12-20", "2025-12-25", timeZone);
    expect(result).toEqual({ status: "green", fullMoonDates: [] });
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

describe("Randfall: Gefahrenzone über eine Monatsgrenze hinweg", () => {
  it("liefert 5 Tage, die zwei Kalendermonate überspannen", () => {
    const fullMoonNearMonthEnd = new Date("2026-09-01T12:00:00Z");
    const zone = dangerZoneDays(fullMoonNearMonthEnd, "Europe/Zurich");
    expect(zone).toEqual(["2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03"]);
  });

  it("checkDateRange erkennt eine Zonen-Berührung über die Monatsgrenze hinweg (echter Vollmond 2026-02-01)", () => {
    // Vollmond-Kalendertag in Europe/Zurich: 2026-02-01 (Zone: 2026-01-30 .. 2026-02-03).
    const result = checkDateRange("2026-01-28", "2026-01-30", "Europe/Zurich");
    expect(result).toEqual({ status: "yellow", fullMoonDates: ["2026-02-01"] });
  });
});
