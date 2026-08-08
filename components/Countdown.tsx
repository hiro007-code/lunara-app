type CountdownProps = {
  daysUntilFullMoon?: number;
  daysSinceLastFullMoon?: number;
};

// Countdown-Texte – echte Berechnung folgt in Etappe 3 (SPEC.md §2.1).
export function Countdown({ daysUntilFullMoon, daysSinceLastFullMoon }: CountdownProps) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-4xl font-semibold text-foreground">
        {daysUntilFullMoon !== undefined ? `Vollmond in ${daysUntilFullMoon} Tagen` : "Vollmond in – Tagen"}
      </p>
      <p className="text-sm text-foreground-muted">
        {daysSinceLastFullMoon !== undefined
          ? `Letzter Vollmond vor ${daysSinceLastFullMoon} Tagen`
          : "Letzter Vollmond vor – Tagen"}
      </p>
    </div>
  );
}
