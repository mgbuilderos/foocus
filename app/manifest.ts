import type { MetadataRoute } from "next";
import { BRAND, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "./_lib/site";

/**
 * Deliberately free of `SITE_URL`: every field is origin-relative, so this
 * route stays statically generated and stays correct on every alias, preview
 * and custom domain without a rebuild.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: BRAND.backgroundDark,
    theme_color: BRAND.backgroundDark,
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon1",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
