import { ImageResponse } from "next/og";
import { BRAND, SITE_NAME, SITE_TAGLINE } from "./_lib/site";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The share card is the homepage masthead and nothing else.
 *
 * `app/page.tsx` sets the wordmark at `text-7xl tracking-[0.2em]` (72px / 0.2em)
 * with the eyebrow at `text-[9px] tracking-[0.4em] mt-3` at 40% foreground.
 * Every value below is that composition multiplied by 150/72, so the card is
 * literally the app's own header at share-card scale.
 *
 * No `fonts` option is passed on purpose: `next/og` ships Noto Sans 400 inside
 * the package, so this builds with no network access and adds no dependency.
 */
export default function OpengraphImage() {
  const scale = 150 / 72;
  const wordmarkSize = 72 * scale; // 150
  const wordmarkTracking = wordmarkSize * 0.2; // 0.2em
  const eyebrowSize = 9 * scale; // 18.75
  const eyebrowTracking = eyebrowSize * 0.4; // 0.4em

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.backgroundDark,
          color: BRAND.foregroundDark,
          // Both lines carry descender leading they never use ("FOOCUS" and
          // "FRICTIONLESS FOCUS" are all-caps), which drops the ink block 14px
          // below the canvas centre. Halved by justify-content, so 28 cancels it
          // and lands the block on the true centre. Verified against the render.
          paddingBottom: 28,
        }}
      >
        <div
          style={{
            fontSize: wordmarkSize,
            letterSpacing: wordmarkTracking,
            // Satori emits trailing letter-spacing after the final glyph, which
            // pulls centred text left by half the tracking. Cancel it.
            paddingLeft: wordmarkTracking,
            lineHeight: 1,
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            marginTop: 12 * scale,
            fontSize: eyebrowSize,
            letterSpacing: eyebrowTracking,
            paddingLeft: eyebrowTracking,
            lineHeight: 1,
            color: "rgba(224, 229, 236, 0.4)",
          }}
        >
          {SITE_TAGLINE.toUpperCase()}
        </div>
      </div>
    ),
    { ...size },
  );
}
