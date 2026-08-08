// Reine SVG-Pfad-Geometrie für die Mondphasen-Silhouette – gemeinsam genutzt von
// components/Moon.tsx und den generierten App-Icons (konsistente Darstellung).

export type MoonPhasePathOptions = {
  /** Beleuchtungsgrad 0–1. */
  fraction: number;
  /** Nordhalbkugel-Konvention: zunehmend = rechts beleuchtet. */
  waxing: boolean;
  center: number;
  radius: number;
};

/**
 * Liefert den SVG-Pfad der beleuchteten Fläche: eine Terminator-Ellipse
 * (horizontaler Radius je nach Beleuchtungsgrad) kombiniert mit dem Kreisrand
 * (Limb) des Mondes.
 */
export function getMoonPhasePath({ fraction, waxing, center, radius }: MoonPhasePathOptions): string {
  const isGibbous = fraction > 0.5;
  const terminatorRadiusX = radius * Math.abs(1 - 2 * fraction);
  const terminatorSweep = waxing !== isGibbous ? 1 : 0;
  const limbSweep = waxing ? 0 : 1;

  return [
    `M ${center} ${center - radius}`,
    `A ${terminatorRadiusX} ${radius} 0 0 ${terminatorSweep} ${center} ${center + radius}`,
    `A ${radius} ${radius} 0 0 ${limbSweep} ${center} ${center - radius}`,
    "Z",
  ].join(" ");
}
