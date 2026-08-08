"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  DEFAULT_TIMEZONE,
  addFavoriteTimezone,
  loadActiveTimezone,
  loadFavoriteTimezones,
  removeFavoriteTimezone,
  saveActiveTimezone,
  saveFavoriteTimezones,
} from "@/lib/timezone";

type TimezoneContextValue = {
  timezone: string;
  setTimezone: (timezone: string) => void;
  favorites: string[];
  toggleFavorite: (timezone: string) => void;
};

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

/**
 * Globaler Zeitzonen-State (SPEC.md §2.3). Startet mit dem Default, damit
 * Server- und erster Client-Render übereinstimmen; die persistierte Auswahl
 * wird erst nach dem Mount aus localStorage nachgeladen (kein Hydration-Fehler).
 */
export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezoneState] = useState(DEFAULT_TIMEZONE);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setTimezoneState(loadActiveTimezone());
    setFavorites(loadFavoriteTimezones());
  }, []);

  function setTimezone(next: string) {
    setTimezoneState(next);
    saveActiveTimezone(next);
  }

  function toggleFavorite(timezoneToToggle: string) {
    setFavorites((current) => {
      const next = current.includes(timezoneToToggle)
        ? removeFavoriteTimezone(current, timezoneToToggle)
        : addFavoriteTimezone(current, timezoneToToggle);
      saveFavoriteTimezones(next);
      return next;
    });
  }

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, favorites, toggleFavorite }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone(): TimezoneContextValue {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error("useTimezone muss innerhalb von TimezoneProvider verwendet werden.");
  }
  return context;
}
