import { ImageResponse } from "next/og";
import { AppIconGraphic } from "@/components/AppIconGraphic";

// Eigene Route (statt der icon.tsx-Konvention), da das Web App Manifest feste
// 192/512px-Icon-URLs benötigt.
export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(<AppIconGraphic />, { width: 512, height: 512 });
}
