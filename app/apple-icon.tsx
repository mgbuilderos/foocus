import { ImageResponse } from "next/og";
import { Mark } from "./_lib/mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home-screen icon. Full-bleed square; iOS applies its own corner mask. */
export default function AppleIcon() {
  return new ImageResponse(<Mark size={size.width} />, { ...size });
}
