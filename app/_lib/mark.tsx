import { BRAND } from "./site";

/**
 * The FOOCUS mark, rebuilt from `app/icon.svg` geometry for Satori
 * (`next/og`), which renders flex boxes rather than SVG strokes.
 *
 * Source viewBox is 256×256: ring `r=80` with `stroke-width=12` (so it spans
 * r 74 → 86, i.e. a 172px outer diameter), solid dot `r=32` (64px diameter).
 * Those ratios are preserved exactly at any `size`.
 *
 * Rendered full-bleed and square — no corner radius — so the result is safe to
 * declare `purpose: "maskable"`: the mark's outermost edge sits at 172/256 =
 * 67% of the canvas, comfortably inside the 80% maskable safe zone.
 */
export function Mark({ size }: { size: number }) {
  const unit = size / 256;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND.iconGround,
      }}
    >
      <div
        style={{
          width: 172 * unit,
          height: 172 * unit,
          borderRadius: "50%",
          border: `${12 * unit}px solid ${BRAND.iconInk}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 64 * unit,
            height: 64 * unit,
            borderRadius: "50%",
            background: BRAND.iconInk,
          }}
        />
      </div>
    </div>
  );
}
