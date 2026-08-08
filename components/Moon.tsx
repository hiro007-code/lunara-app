type MoonProps = {
  illumination?: number;
};

// SVG-Mond mit Phasen-Rendering – Berechnung folgt in Etappe 3 (SPEC.md §2.1).
export function Moon({ illumination }: MoonProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-48 w-48"
      role="img"
      aria-label={illumination !== undefined ? `Mond, ${Math.round(illumination * 100)}% beleuchtet` : "Mond"}
    >
      <circle cx="100" cy="100" r="90" className="fill-foreground/10 stroke-foreground/30" strokeWidth="1" />
    </svg>
  );
}
