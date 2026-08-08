"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Onboarding } from "@/components/Onboarding";
import { getActivationState, retryPendingSync } from "@/lib/onboarding";

/**
 * Zeigt den Onboarding-Screen, solange keine Aktivierung in localStorage vorliegt;
 * danach direkter Sprung in die App (SPEC.md §2.5). Entscheidung erst nach dem Mount
 * (localStorage ist server-seitig nicht verfügbar) – kein Hydration-Fehler.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const state = getActivationState();
    setShowOnboarding(state === "new");
    if (state === "pending-sync") {
      retryPendingSync();
    }
  }, []);

  if (showOnboarding === null) {
    return null;
  }

  if (showOnboarding) {
    return <Onboarding onActivated={() => setShowOnboarding(false)} />;
  }

  return <>{children}</>;
}
