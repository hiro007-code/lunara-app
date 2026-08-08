import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getReminderDay, wasAlreadyNotifiedToday } from "./reminder";

// Bekannter Vollmond, bereits an mehreren Stellen in diesem Projekt verifiziert:
// 2026-08-28T04:19:06.085Z, Kalendertag in Europe/Zurich: 2026-08-28.
const ZURICH_TZ = "Europe/Zurich";

// Vollmond nur 5 Minuten vor Mitternacht UTC (SPEC.md §3 Randfall): fällt je nach
// Zeitzone auf unterschiedliche Kalendertage – Tokyo 2021-09-21, Los Angeles 2021-09-20.
const TOKYO_TZ = "Asia/Tokyo";
const LA_TZ = "America/Los_Angeles";

describe("getReminderDay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("liefert 7, wenn heute (in der Zeitzone) genau 7 Kalendertage vor dem Vollmond liegt", () => {
    vi.setSystemTime(new Date("2026-08-21T10:00:00Z"));
    expect(getReminderDay(new Date(), ZURICH_TZ)).toBe(7);
  });

  it("liefert 3, wenn heute genau 3 Kalendertage vor dem Vollmond liegt", () => {
    vi.setSystemTime(new Date("2026-08-25T10:00:00Z"));
    expect(getReminderDay(new Date(), ZURICH_TZ)).toBe(3);
  });

  it("liefert null für alle anderen Tage (z. B. 8 Tage vorher)", () => {
    vi.setSystemTime(new Date("2026-08-20T10:00:00Z"));
    expect(getReminderDay(new Date(), ZURICH_TZ)).toBeNull();
  });

  it("liefert null am Vollmond-Tag selbst (Differenz 0)", () => {
    vi.setSystemTime(new Date("2026-08-28T10:00:00Z"));
    expect(getReminderDay(new Date(), ZURICH_TZ)).toBeNull();
  });

  it("Randfall Datumskipp: derselbe Zeitpunkt ist für eine Zeitzone ein Erinnerungstag, für eine andere nicht", () => {
    const now = new Date("2021-09-14T12:00:00Z");
    vi.setSystemTime(now);
    // Tokyo: Vollmond-Kalendertag 2021-09-21, heute dort ebenfalls 2021-09-14 -> Differenz 7.
    expect(getReminderDay(new Date(), TOKYO_TZ)).toBe(7);
    // Los Angeles: Vollmond-Kalendertag bereits 2021-09-20 (ein Tag früher) -> Differenz nur 6.
    expect(getReminderDay(new Date(), LA_TZ)).toBeNull();
  });
});

describe("wasAlreadyNotifiedToday (Doppelsendungs-Schutz)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("false, wenn noch nie benachrichtigt wurde", () => {
    expect(wasAlreadyNotifiedToday(new Date(), ZURICH_TZ, null)).toBe(false);
  });

  it("true, wenn bereits heute (gleicher Kalendertag) benachrichtigt wurde", () => {
    const lastNotifiedAt = new Date("2026-08-21T06:00:00Z"); // selber Zurich-Kalendertag, andere Uhrzeit
    expect(wasAlreadyNotifiedToday(new Date(), ZURICH_TZ, lastNotifiedAt)).toBe(true);
  });

  it("false, wenn die letzte Benachrichtigung an einem anderen Kalendertag war (z. B. die 7-Tage-Erinnerung vor der 3-Tage-Erinnerung)", () => {
    const lastNotifiedAt = new Date("2026-08-17T10:00:00Z"); // vier Tage zuvor
    expect(wasAlreadyNotifiedToday(new Date(), ZURICH_TZ, lastNotifiedAt)).toBe(false);
  });

  it("berücksichtigt die Zeitzone bei der Kalendertag-Zuordnung (Randfall Datumskipp)", () => {
    // "now" liegt kurz nach Mitternacht UTC, die letzte Benachrichtigung stammt vom Vortag
    // (15 Stunden früher, realistisch chronologisch). Zwischen beiden Zeitpunkten liegt
    // Tokyos lokale Mitternacht (UTC+9 -> 15:00 UTC), aber noch nicht die von Los Angeles
    // (UTC-7 -> 07:00 UTC): Tokyo sieht dadurch zwei verschiedene Kalendertage, LA denselben.
    vi.setSystemTime(new Date("2021-09-15T01:00:00Z"));
    const lastNotifiedAt = new Date("2021-09-14T10:00:00Z");

    expect(wasAlreadyNotifiedToday(new Date(), TOKYO_TZ, lastNotifiedAt)).toBe(false);
    expect(wasAlreadyNotifiedToday(new Date(), LA_TZ, lastNotifiedAt)).toBe(true);
  });
});
