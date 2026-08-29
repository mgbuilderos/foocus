import { ImageResponse } from "next/og";
import { Mark } from "./_lib/mark";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/**
 * 512×512 raster of the mark. `app/icon.svg` remains the primary favicon; this
 * exists because a maskable manifest icon must be full-bleed (the SVG has
 * `rx="64"`, so its corners are transparent and would mask badly) and because
 * Android uses a 512px icon for the PWA splash screen.
 */
export default function Icon() {
  return new ImageResponse(<Mark size={size.width} />, { ...size });
}
