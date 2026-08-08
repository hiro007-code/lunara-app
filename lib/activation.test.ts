import { describe, expect, it } from "vitest";
import { isValidPlatform, isValidUuid } from "./activation";

describe("isValidUuid", () => {
  it("akzeptiert eine gültige UUID (beliebige Gross-/Kleinschreibung)", () => {
    expect(isValidUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidUuid("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("lehnt ungültige Werte ab", () => {
    expect(isValidUuid("nicht-valide")).toBe(false);
    expect(isValidUuid("550e8400-e29b-41d4-a716")).toBe(false);
    expect(isValidUuid("550e8400e29b41d4a716446655440000")).toBe(false);
    expect(isValidUuid(12345)).toBe(false);
    expect(isValidUuid(undefined)).toBe(false);
    expect(isValidUuid(null)).toBe(false);
    expect(isValidUuid({})).toBe(false);
  });

  it("lehnt SQL-Injection-artige Eingaben ab", () => {
    expect(isValidUuid("550e8400-e29b-41d4-a716-446655440000'; DROP TABLE activations; --")).toBe(false);
  });
});

describe("isValidPlatform", () => {
  it("akzeptiert genau die erlaubten Plattform-Werte", () => {
    expect(isValidPlatform("ios")).toBe(true);
    expect(isValidPlatform("android")).toBe(true);
    expect(isValidPlatform("other")).toBe(true);
  });

  it("lehnt unbekannte oder falsch typisierte Werte ab", () => {
    expect(isValidPlatform("windows")).toBe(false);
    expect(isValidPlatform("iOS")).toBe(false);
    expect(isValidPlatform("")).toBe(false);
    expect(isValidPlatform(123)).toBe(false);
    expect(isValidPlatform(undefined)).toBe(false);
    expect(isValidPlatform(null)).toBe(false);
  });
});
