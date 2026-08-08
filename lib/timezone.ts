// Zeitzonen-Helpers & Favoriten (localStorage) – Implementierung folgt in Etappe 5 (SPEC.md §2.3).

export const DEFAULT_TIMEZONE = "Europe/Zurich";

export function getFavoriteTimezones(): string[] {
  return [DEFAULT_TIMEZONE];
}

export function addFavoriteTimezone(timezone: string): string[] {
  return [timezone];
}
