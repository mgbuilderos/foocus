/**
 * Single source of truth for identity, canonical origin and brand colour.
 *
 * Colour values are lifted verbatim from `app/globals.css` — the body paints
 * `var(--mesh-bg)`, whose terminal (base) colour is what the browser chrome
 * must match. Do not invent new values here; change `globals.css` instead.
 */

export const SITE_NAME = "FOOCUS";
export const SITE_TAGLINE = "Frictionless Focus";

export const SITE_DESCRIPTION =
  "A hyper-minimalist focus-sprint timer. Set an intent, run the sprint, finish. Everything stays on your device — nothing is ever sent to a server.";

/** Sourced from app/globals.css — see the comment above. */
export const BRAND = {
  /** `.dark { --mesh-bg: … #121418 }` — globals.css:28 */
  backgroundDark: "#121418",
  /** `:root { --mesh-bg: … #e8edf3 }` — globals.css:16 */
  backgroundLight: "#e8edf3",
  /** `.dark { --foreground: #e0e5ec }` — globals.css:20 */
  foregroundDark: "#e0e5ec",
  /** app/icon.svg — the mark's ground and ink. */
  iconGround: "#0a0a0a",
  iconInk: "#ffffff",
} as const;

function normalise(value: string): string {
  const absolute = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return absolute.replace(/\/+$/, "");
}

/**
 * Canonical origin, resolved without a network call and correct with **zero**
 * environment variables set:
 *
 *  1. `NEXT_PUBLIC_SITE_URL` — explicit override, so a custom domain can be
 *     adopted without a code change.
 *  2. Vercel preview / branch deploys describe themselves via `VERCEL_URL`, so
 *     share cards and canonicals stay inside the deployment under review
 *     instead of silently pointing at production.
 *  3. `VERCEL_PROJECT_PRODUCTION_URL` — the stable production hostname Vercel
 *     injects at build time (no protocol, hence `normalise`). Unlike
 *     `VERCEL_URL` it does not change per deployment.
 *  4. `next dev` — the local origin.
 *  5. The known production alias, so nothing is required to be configured.
 */
export const SITE_URL: string = (() => {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return normalise(process.env.NEXT_PUBLIC_SITE_URL);
  }
  if (
    process.env.VERCEL_ENV &&
    process.env.VERCEL_ENV !== "production" &&
    process.env.VERCEL_URL
  ) {
    return normalise(process.env.VERCEL_URL);
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return normalise(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  }
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  return "https://foocus-nine.vercel.app";
})();
