import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TIMEZONE,
  MAX_FAVORITES,
  addFavoriteTimezone,
  calendarDateToUTC,
  getTimezoneLabel,
  loadActiveTimezone,
  loadFavoriteTimezones,
  removeFavoriteTimezone,
  saveActiveTimezone,
  saveFavoriteTimezones,
  shiftCalendarDate,
  toCalendarDate,
} from "./timezone";

describe("toCalendarDate", () => {
  it("ordnet einen UTC-Zeitpunkt dem Kalendertag in der angegebenen Zeitzone zu", () => {
    expect(toCalendarDate(new Date("2025-01-13T22:27:32.237Z"), "Europe/Zurich")).toBe("2025-01-13");
  });

  it("Randfall: derselbe Zeitpunkt fällt je nach Zeitzone auf unterschiedliche Kalendertage", () => {
    const moment = new Date("2021-09-20T23:55:20.091Z");
    expect(toCalendarDate(moment, "Asia/Tokyo")).toBe("2021-09-21");
    expect(toCalendarDate(moment, "America/Los_Angeles")).toBe("2021-09-20");
  });
});

describe("calendarDateToUTC / shiftCalendarDate", () => {
  it("wandelt einen Kalendertag in Mitternacht UTC um", () => {
    expect(calendarDateToUTC("2025-01-13").toISOString()).toBe("2025-01-13T00:00:00.000Z");
  });

  it("verschiebt Kalendertage über Monats- und Jahresgrenzen hinweg korrekt", () => {
    expect(shiftCalendarDate("2025-01-01", -1)).toBe("2024-12-31");
    expect(shiftCalendarDate("2025-01-31", 1)).toBe("2025-02-01");
    expect(shiftCalendarDate("2025-01-13", 2)).toBe("2025-01-15");
    expect(shiftCalendarDate("2025-01-13", -2)).toBe("2025-01-11");
  });
});

describe("getTimezoneLabel", () => {
  it("zerlegt eine Zone in Stadt und Region, Unterstriche werden zu Leerzeichen", () => {
    expect(getTimezoneLabel("Europe/Zurich")).toEqual({ city: "Zurich", region: "Europe" });
    expect(getTimezoneLabel("America/Los_Angeles")).toEqual({ city: "Los Angeles", region: "America" });
  });

  it("behandelt mehrsegmentige Zonen (Region bleibt zusammengesetzt)", () => {
    expect(getTimezoneLabel("America/Argentina/Buenos_Aires")).toEqual({
      city: "Buenos Aires",
      region: "America/Argentina",
    });
  });

  it("behandelt Zonen ohne Pfadsegment (z. B. UTC)", () => {
    expect(getTimezoneLabel("UTC")).toEqual({ city: "UTC", region: "" });
  });
});

describe("addFavoriteTimezone / removeFavoriteTimezone", () => {
  it("fügt eine neue Zeitzone hinzu", () => {
    expect(addFavoriteTimezone([], "Europe/Zurich")).toEqual(["Europe/Zurich"]);
  });

  it("verhindert Duplikate", () => {
    expect(addFavoriteTimezone(["Europe/Zurich"], "Europe/Zurich")).toEqual(["Europe/Zurich"]);
  });

  it(`erlaubt maximal ${MAX_FAVORITES} Favoriten`, () => {
    const full = ["Europe/Zurich", "Asia/Bangkok", "Pacific/Honolulu", "America/New_York"];
    expect(full).toHaveLength(MAX_FAVORITES);
    expect(addFavoriteTimezone(full, "Asia/Tokyo")).toEqual(full);
    expect(addFavoriteTimezone(full, "Asia/Tokyo")).toHaveLength(MAX_FAVORITES);
  });

  it("entfernt eine vorhandene Zeitzone", () => {
    expect(removeFavoriteTimezone(["Europe/Zurich", "Asia/Bangkok"], "Europe/Zurich")).toEqual(["Asia/Bangkok"]);
  });

  it("entfernen einer nicht enthaltenen Zone lässt die Liste unverändert", () => {
    expect(removeFavoriteTimezone(["Europe/Zurich"], "Asia/Bangkok")).toEqual(["Europe/Zurich"]);
  });
});

describe("Zeitzonen-Persistenz (localStorage)", () => {
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

  it("liefert die Default-Zeitzone, wenn nichts gespeichert ist", () => {
    expect(loadActiveTimezone()).toBe(DEFAULT_TIMEZONE);
  });

  it("speichert und lädt die aktive Zeitzone", () => {
    saveActiveTimezone("Asia/Bangkok");
    expect(loadActiveTimezone()).toBe("Asia/Bangkok");
  });

  it("liefert eine leere Favoritenliste, wenn nichts gespeichert ist", () => {
    expect(loadFavoriteTimezones()).toEqual([]);
  });

  it("speichert und lädt Favoriten", () => {
    saveFavoriteTimezones(["Europe/Zurich", "Asia/Bangkok"]);
    expect(loadFavoriteTimezones()).toEqual(["Europe/Zurich", "Asia/Bangkok"]);
  });

  it("ignoriert kaputte/fremde Daten in localStorage und fällt auf eine leere Liste zurück", () => {
    localStorage.setItem("lunara:favorite-timezones", "{not valid json");
    expect(loadFavoriteTimezones()).toEqual([]);
  });
});
