import type { MetadataRoute } from "next";

// Web App Manifest für die Homescreen-Installation (SPEC.md §4).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lunara – Vollmond-Countdown & Ferienplanung",
    short_name: "Lunara",
    description: "Countdown bis zum nächsten Vollmond und Reisedaten in Sekunden auf Vollmond-Gefahr prüfen.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e1a",
    theme_color: "#0a0e1a",
    lang: "de-CH",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
