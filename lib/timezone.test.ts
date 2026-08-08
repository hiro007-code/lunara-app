import { describe, expect, it } from "vitest";
import { calendarDateToUTC, shiftCalendarDate, toCalendarDate } from "./timezone";

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
