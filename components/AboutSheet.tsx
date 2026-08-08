"use client";

import { Sheet } from "@/components/Sheet";

type AboutSheetProps = {
  onClose: () => void;
};

/** "Über diese App" (SPEC.md §2.5) – jederzeit erneut auffindbares Worum-geht's + Datenschutz-Hinweis. */
export function AboutSheet({ onClose }: AboutSheetProps) {
  return (
    <Sheet title="Über diese App" onClose={onClose}>
      <div className="flex flex-col gap-3 pb-1 text-sm text-foreground-muted">
        <p>
          Lunara zeigt dir auf einen Blick, wann der nächste Vollmond ist. Für Familien, deren
          Kinder sensibel auf Vollmond reagieren, hilft die App, Ferien und wichtige Termine
          mondfrei zu planen.
        </p>
        <p className="text-xs">
          Bei der Aktivierung wird eine anonyme Zufalls-ID gezählt – keine Personendaten.
        </p>
      </div>
    </Sheet>
  );
}
