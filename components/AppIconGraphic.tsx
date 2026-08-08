import { getMoonPhasePath } from "@/lib/moonPhaseSvg";

// Feste Phase fürs App-Icon (kein Live-Wert nötig) – gleiche Geometrie wie Moon.tsx.
const ICON_FRACTION = 0.7;
const ICON_WAXING = true;
const VIEWBOX_SIZE = 200;
const CENTER = VIEWBOX_SIZE / 2;
const RADIUS = 72;

/** Statisches Mond-Icon für Favicon/App-Icons – konsistent mit components/Moon.tsx. */
export function AppIconGraphic() {
  const litPath = getMoonPhasePath({ fraction: ICON_FRACTION, waxing: ICON_WAXING, center: CENTER, radius: RADIUS });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0e1a",
      }}
    >
      <svg width="82%" height="82%" viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="#2a2f3f" />
        <path d={litPath} fill="#f2ece0" />
      </svg>
    </div>
  );
}
