"use client";

import { useEffect, useMemo, useState } from "react";
import { Moon } from "@/components/Moon";
import { activate, detectPlatform } from "@/lib/onboarding";

type OnboardingProps = {
  onActivated: () => void;
};

/** Feste Phase fürs Logo (kein Live-Wert nötig) – gleiche Darstellung wie components/Moon.tsx. */
const LOGO_FRACTION = 0.7;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 2v10M6.5 5.5L10 2l3.5 3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 9v7a1 1 0 001 1h10a1 1 0 001-1V9" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
      <circle cx="10" cy="4" r="1.3" />
      <circle cx="10" cy="10" r="1.3" />
      <circle cx="10" cy="16" r="1.3" />
    </svg>
  );
}

/** Onboarding- & Aktivierungs-Screen (SPEC.md §2.5) – einmalig vor der eigentlichen App. */
export function Onboarding({ onActivated }: OnboardingProps) {
  const platform = useMemo(() => detectPlatform(navigator.userAgent), []);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function handleInstallClick() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  async function handleActivate() {
    setActivating(true);
    // Schliesst immer lokal ab (siehe lib/onboarding.ts) – die Nutzerin wird nie blockiert,
    // auch wenn der Server-Sync fehlschlägt.
    await activate(platform);
    onActivated();
  }

  return (
    <div className="stars-bg animate-fade-in flex min-h-screen flex-col items-center px-6 py-10 text-center">
      <Moon fraction={LOGO_FRACTION} waxing className="w-20" />

      <div className="mt-6 flex flex-col gap-3">
        <h1 className="text-xl font-semibold text-foreground">Lunara</h1>
        <p className="text-sm text-foreground-muted">
          Lunara zeigt dir auf einen Blick, wann der nächste Vollmond ist. Für Familien, deren
          Kinder sensibel auf Vollmond reagieren, hilft die App, Ferien und wichtige Termine
          mondfrei zu planen.
        </p>
      </div>

      <div className="mt-10 flex w-full flex-col gap-3 text-left">
        <h2 className="text-xs tracking-wide text-foreground-muted uppercase">Installation</h2>

        {platform === "ios" && (
          <p className="flex items-start gap-3 text-sm text-foreground-muted">
            <ShareIcon />
            <span>Teilen-Symbol antippen → "Zum Home-Bildschirm" (geht in Safari und Chrome).</span>
          </p>
        )}

        {platform === "android" && (
          <>
            <p className="flex items-start gap-3 text-sm text-foreground-muted">
              <MenuIcon />
              <span>Menü (drei Punkte) → "App installieren".</span>
            </p>
            {installPrompt && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="focus-ring self-start rounded-md border border-white/10 px-4 py-2 text-sm text-foreground"
              >
                App installieren
              </button>
            )}
          </>
        )}

        {platform === "other" && (
          <p className="text-sm text-foreground-muted">
            Mobil: Menü (drei Punkte) → "App installieren" (Android) bzw. Teilen-Symbol → "Zum
            Home-Bildschirm" (iOS, Safari und Chrome).
          </p>
        )}
      </div>

      <div className="mt-10 flex w-full flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleActivate}
          disabled={activating}
          className="focus-ring w-full rounded-full bg-foreground px-6 py-4 text-base font-semibold text-background disabled:opacity-60"
        >
          Aktivieren
        </button>
        <p className="text-xs text-foreground-muted">
          Bei der Aktivierung wird eine anonyme Zufalls-ID gezählt – keine Personendaten.
        </p>
      </div>
    </div>
  );
}
