"use client";

import { useMemo, useRef, useState } from "react";
import { Sheet } from "@/components/Sheet";
import { useTimezone } from "@/components/TimezoneProvider";
import { MAX_FAVORITES, getAllTimezones, getTimezoneLabel } from "@/lib/timezone";

type TimezonePickerProps = {
  onClose: () => void;
};

const ALL_TIMEZONES = getAllTimezones();

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 ${filled ? "text-amber" : "text-foreground-muted"}`}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 2.5l2.24 4.53 5 .73-3.62 3.53.85 4.98L10 13.9l-4.47 2.35.85-4.98L2.76 7.76l5-.73L10 2.5z"
      />
    </svg>
  );
}

type TimezoneRowProps = {
  timezone: string;
  active: boolean;
  favorite: boolean;
  favoriteDisabled?: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
};

function TimezoneRow({ timezone, active, favorite, favoriteDisabled, onSelect, onToggleFavorite }: TimezoneRowProps) {
  const { city, region } = getTimezoneLabel(timezone);
  return (
    <div className="flex items-center gap-2 border-b border-white/5 py-2 last:border-b-0">
      <button
        type="button"
        onClick={onSelect}
        className={`focus-ring flex-1 text-left text-sm ${active ? "text-foreground" : "text-foreground-muted"}`}
      >
        {city}
        {region && <span className="text-foreground-muted"> – {region}</span>}
      </button>
      <button
        type="button"
        onClick={onToggleFavorite}
        disabled={favoriteDisabled}
        aria-label={favorite ? "Favorit entfernen" : "Als Favorit markieren"}
        aria-pressed={favorite}
        className={`focus-ring ${favoriteDisabled ? "cursor-not-allowed opacity-30" : ""}`}
      >
        <StarIcon filled={favorite} />
      </button>
    </div>
  );
}

/** Zeitzonen-Sheet (SPEC.md §2.3): Suche + Favoriten. */
export function TimezonePicker({ onClose }: TimezonePickerProps) {
  const { timezone, setTimezone, favorites, toggleFavorite } = useTimezone();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmedQuery = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!trimmedQuery) return [];
    return ALL_TIMEZONES.filter((tz) => {
      if (favorites.includes(tz)) return false;
      const { city, region } = getTimezoneLabel(tz);
      return `${city} ${region} ${tz}`.toLowerCase().includes(trimmedQuery);
    });
  }, [trimmedQuery, favorites]);

  function handleSelect(tz: string) {
    setTimezone(tz);
    onClose();
  }

  return (
    <Sheet title="Zeitzone" onClose={onClose} initialFocusRef={inputRef}>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Stadt oder Region suchen"
        className="focus-ring w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted"
      />

      <div className="mt-3">
        {favorites.length > 0 && (
          <div className="flex flex-col pb-2">
            <h3 className="pb-1 text-xs text-foreground-muted">Favoriten</h3>
            {favorites.map((tz) => (
              <TimezoneRow
                key={tz}
                timezone={tz}
                active={tz === timezone}
                favorite
                onSelect={() => handleSelect(tz)}
                onToggleFavorite={() => toggleFavorite(tz)}
              />
            ))}
          </div>
        )}

        {trimmedQuery === "" ? (
          <p className="py-3 text-sm text-foreground-muted">Stadt oder Region eingeben …</p>
        ) : matches.length === 0 ? (
          <p className="py-3 text-sm text-foreground-muted">Keine Zeitzone gefunden.</p>
        ) : (
          <div className="flex flex-col">
            {matches.map((tz) => (
              <TimezoneRow
                key={tz}
                timezone={tz}
                active={tz === timezone}
                favorite={false}
                favoriteDisabled={favorites.length >= MAX_FAVORITES}
                onSelect={() => handleSelect(tz)}
                onToggleFavorite={() => toggleFavorite(tz)}
              />
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
