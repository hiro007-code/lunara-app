"use client";

import { useEffect, useState } from "react";
import type { Platform } from "@/lib/activation";
import { loadAdminStats, type AdminSessionState, type AdminStats } from "@/lib/admin";

const PLATFORM_LABELS: Record<Platform, string> = {
  ios: "iOS",
  android: "Android",
  other: "Sonstige",
};

/**
 * Ruhige Admin-Statistik-Sektion (SPEC.md §2.7), unten in der Planung-View: unsichtbar
 * ohne gespeicherten Admin-Token (?admin=... im Onboarding-Flow, siehe AdminTokenCapture),
 * sonst Aktivierungszahlen aus /api/stats. Reine Ansicht ohne Wirkung auf Onboarding,
 * Aktivierung oder Erinnerungen – für alle anderen Nutzerinnen bleibt die App unverändert.
 */
export function AdminPanel() {
  const [state, setState] = useState<AdminSessionState>({ status: "hidden" });

  useEffect(() => {
    let cancelled = false;
    loadAdminStats().then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "hidden") return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs tracking-wide text-foreground-muted uppercase">Admin-Statistik</h2>

      {state.status === "invalid-token" && (
        <p className="text-xs text-foreground-muted">Ungültiger Admin-Token – Zugriff verworfen.</p>
      )}
      {state.status === "unavailable" && (
        <p className="text-xs text-foreground-muted">Statistik gerade nicht verfügbar.</p>
      )}
      {state.status === "visible" && <AdminStatsSummary stats={state.stats} />}
    </section>
  );
}

function AdminStatsSummary({ stats }: { stats: AdminStats }) {
  const maxWeekly = Math.max(1, ...stats.weekly.map((week) => week.count));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <StatRow label="Aktivierungen gesamt" value={stats.total} />
        <StatRow label="Letzte 7 Tage" value={stats.last7days} />
        <StatRow label="Push-Abos" value={stats.pushSubscriptions} />
      </div>

      <div className="flex flex-col gap-1">
        {(Object.keys(PLATFORM_LABELS) as Platform[]).map((platform) => (
          <StatRow key={platform} label={PLATFORM_LABELS[platform]} value={stats.platforms[platform]} small />
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-foreground-muted">Wochenverlauf (12 Wochen)</span>
        {stats.weekly.map((week) => (
          <div key={week.weekStart} className="flex items-center gap-2 text-xs text-foreground-muted">
            <span className="w-20 shrink-0">{week.weekStart}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full bg-white/25"
                style={{ width: `${(week.count / maxWeekly) * 100}%` }}
              />
            </span>
            <span className="w-5 shrink-0 text-right">{week.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatRow({ label, value, small }: { label: string; value: number; small?: boolean }) {
  return (
    <div className={`flex justify-between ${small ? "text-xs" : "text-sm"} text-foreground-muted`}>
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
