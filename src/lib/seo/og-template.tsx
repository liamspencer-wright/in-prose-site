/**
 * Shared OG-image template parts for in prose. Imported by per-route
 * `opengraph-image.tsx` + `twitter-image.tsx` files.
 *
 * Brand tokens are inlined here (not from CSS vars) because
 * `ImageResponse` from `next/og` runs on the edge and renders via Satori —
 * no DOM, no CSS variables.
 */

import type { ReactElement } from "react";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png" as const;

export const BRAND = {
  bgLight: "#fbf1ec",
  bgMedium: "#f4dcc2",
  textPrimary: "#1b1b1b",
  textMuted: "rgba(27, 27, 27, 0.65)",
  textSubtle: "rgba(27, 27, 27, 0.35)",
  accent: "#ff7f32",
  accentBlue: "#203150",
  textOnAccent: "#F8EEE1",
} as const;

export type FrameProps = {
  children: ReactElement | ReactElement[];
  /** Optional override of the page background. */
  background?: string;
};

/**
 * Common page frame with brand bar at the bottom.
 * All inline styles — Satori does not load classes.
 */
export function Frame({ children, background = BRAND.bgLight }: FrameProps): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background,
        fontFamily: "serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flex: 1,
          padding: "60px 72px",
        }}
      >
        {children}
      </div>
      <BrandBar />
    </div>
  );
}

function BrandBar(): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 72px",
        background: BRAND.accentBlue,
        color: BRAND.textOnAccent,
        fontSize: 24,
        fontWeight: 700,
        letterSpacing: 0.5,
      }}
    >
      <span>in prose</span>
      <span style={{ fontSize: 20, fontWeight: 400, opacity: 0.7 }}>
        Books and data — perfectly bound.
      </span>
    </div>
  );
}

/**
 * Last-resort fallback used by every OG endpoint when generation fails or
 * an entity is missing. Keep this dependency-free.
 */
export function Fallback(): ReactElement {
  return (
    <Frame>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <span style={{ fontSize: 96, fontWeight: 700, color: BRAND.textPrimary, lineHeight: 1.0 }}>
          in prose
        </span>
        <span style={{ marginTop: 24, fontSize: 36, color: BRAND.textMuted }}>
          Books and data — perfectly bound.
        </span>
      </div>
    </Frame>
  );
}
