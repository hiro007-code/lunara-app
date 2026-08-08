"use client";

import { useEffect, useState } from "react";
import { useTimezone } from "@/components/TimezoneProvider";
import { getStoredActivation } from "@/lib/onboarding";
import {
  disablePushReminders,
  enablePushReminders,
  getNotificationPermissionState,
  getRemindersEnabled,
  isPushSupported,
  shouldOfferPushPrompt,
  syncSubscriptionTimezone,
} from "@/lib/push";

/**
 * Erinnerungs-Sektion in der Planung-View (SPEC.md §2.5): spiegelt den im
 * Onboarding gesetzten Zustand und erlaubt nachträgliches Ein-/Ausschalten.
 * Zeitzonen-Wechsel aktualisiert eine aktive Subscription automatisch.
 */
export function ReminderToggle() {
  const { timezone } = useTimezone();
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEnabled(getRemindersEnabled());
    setPermission(getNotificationPermissionState());
    setReady(true);
  }, []);

  // Zeitzonen-Wechsel hält eine bereits aktive Subscription aktuell, ohne erneut zu fragen.
  useEffect(() => {
    if (!ready || !enabled) return;
    const stored = getStoredActivation();
    if (!stored) return;
    syncSubscriptionTimezone(stored.uuid, timezone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone, ready]);

  async function handleToggle() {
    const stored = getStoredActivation();
    if (!stored || busy) return;
    setBusy(true);
    if (enabled) {
      await disablePushReminders(stored.uuid);
      setEnabled(false);
    } else {
      const success = await enablePushReminders(stored.uuid, timezone);
      setEnabled(success);
      setPermission(getNotificationPermissionState());
    }
    setBusy(false);
  }

  if (!ready) return null;

  const stored = getStoredActivation();
  const offerAvailable = stored !== null && isPushSupported() && shouldOfferPushPrompt(stored.platform);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs tracking-wide text-foreground-muted uppercase">Erinnerungen</h2>

      {!offerAvailable ? (
        <p className="text-sm text-foreground-muted">
          Erinnerungen sind auf iOS nur nach der Installation verfügbar (Teilen-Symbol → "Zum
          Home-Bildschirm").
        </p>
      ) : (
        <>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={handleToggle}
            disabled={busy || permission === "denied"}
            className="focus-ring flex items-center justify-between gap-3 rounded-md border border-white/10 px-4 py-3 text-left disabled:opacity-60"
          >
            <span className="text-sm text-foreground">Erinnerungen 7 und 3 Tage vor Vollmond</span>
            <span
              className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                enabled ? "bg-green justify-end" : "bg-white/15 justify-start"
              }`}
            >
              <span className="h-4 w-4 rounded-full bg-background" />
            </span>
          </button>
          {permission === "denied" && (
            <p className="text-xs text-foreground-muted">
              Benachrichtigungen sind in deinen Geräte-Einstellungen blockiert. Um Erinnerungen zu
              erhalten, dort für Lunara erlauben.
            </p>
          )}
        </>
      )}
    </section>
  );
}
