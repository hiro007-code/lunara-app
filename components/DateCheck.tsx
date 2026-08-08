type DateCheckResult = "green" | "yellow" | "red";

type DateCheckProps = {
  result?: DateCheckResult;
};

// Reise-Ampel (Datums-Check) – echte Logik folgt in Etappe 4 (SPEC.md §2.2b).
export function DateCheck({ result }: DateCheckProps) {
  return (
    <div className="rounded-lg border border-white/10 p-4 text-sm text-foreground-muted">
      {result ? `Ergebnis: ${result}` : "Datums-Check folgt in Etappe 4."}
    </div>
  );
}
