// Geteilte Typen und serverseitige Validierung für den anonymen
// Aktivierungszähler (SPEC.md §2.5, §4). Reine Funktionen, keine Persistenz.

export const PLATFORMS = ["ios", "android", "other"] as const;
export type Platform = (typeof PLATFORMS)[number];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

export function isValidPlatform(value: unknown): value is Platform {
  return typeof value === "string" && (PLATFORMS as readonly string[]).includes(value);
}
