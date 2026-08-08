import { useId } from "react";

type MoonProps = {
  fraction: number;
  waxing: boolean;
  className?: string;
};

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 84;

/**
 * SVG-Mond mit Phasen-Rendering (SPEC.md §2.1). Die beleuchtete Fläche wird aus
 * zwei Bogenpfaden konstruiert: einer Terminator-Ellipse (horizontaler Radius
 * je nach Beleuchtungsgrad) und dem Kreisrand (Limb). Nordhalbkugel-Konvention:
 * zunehmender Mond ist rechts beleuchtet.
 */
export function Moon({ fraction, waxing, className }: MoonProps) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const glowId = `moon-glow-${rawId}`;

  const isGibbous = fraction > 0.5;
  const terminatorRadiusX = RADIUS * Math.abs(1 - 2 * fraction);
  const terminatorSweep = waxing !== isGibbous ? 1 : 0;
  const limbSweep = waxing ? 0 : 1;

  const litPath = [
    `M ${CENTER} ${CENTER - RADIUS}`,
    `A ${terminatorRadiusX} ${RADIUS} 0 0 ${terminatorSweep} ${CENTER} ${CENTER + RADIUS}`,
    `A ${RADIUS} ${RADIUS} 0 0 ${limbSweep} ${CENTER} ${CENTER - RADIUS}`,
    "Z",
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={`h-auto w-60 sm:w-72 ${className ?? ""}`}
      role="img"
      aria-label={`Mond, ${Math.round(fraction * 100)} Prozent beleuchtet, ${waxing ? "zunehmend" : "abnehmend"}`}
    >
      <defs>
        <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <circle cx={CENTER} cy={CENTER} r={RADIUS * 1.08} filter={`url(#${glowId})`} className="fill-foreground/10" />
      <circle cx={CENTER} cy={CENTER} r={RADIUS} className="fill-foreground/10 stroke-foreground/20" strokeWidth="1" />
      <path d={litPath} className="fill-foreground" />
    </svg>
  );
}
