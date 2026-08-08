import { ImageResponse } from "next/og";
import { AppIconGraphic } from "@/components/AppIconGraphic";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<AppIconGraphic />, size);
}
