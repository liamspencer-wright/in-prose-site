import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import {
  Frame,
  Fallback,
  BRAND,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/seo/og-template";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "In Prose series";

type Props = {
  params: { slug: string };
};

export default async function SeriesOgImage({ params }: Props) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .rpc("get_series_by_slug", { p_slug: params.slug })
      .maybeSingle();

    if (!data) return new ImageResponse(<Fallback />, OG_SIZE);

    const s = data as {
      name: string;
      book_count: number;
      earliest_year: number | null;
      latest_year: number | null;
      primary_author_name: string | null;
      universe_name: string | null;
    };

    const range =
      s.earliest_year && s.latest_year
        ? s.earliest_year === s.latest_year
          ? `${s.earliest_year}`
          : `${s.earliest_year}–${s.latest_year}`
        : null;

    return new ImageResponse(
      (
        <Frame>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
            <span
              style={{
                fontSize: 22,
                textTransform: "uppercase",
                letterSpacing: 1.6,
                color: BRAND.accent,
              }}
            >
              Series · Reading order
            </span>
            <span
              style={{
                fontSize: 84,
                fontWeight: 700,
                lineHeight: 1.0,
                color: BRAND.textPrimary,
              }}
            >
              {s.name}
            </span>
            {s.primary_author_name && (
              <span style={{ fontSize: 32, color: BRAND.textMuted }}>
                by {s.primary_author_name}
              </span>
            )}
            <div style={{ display: "flex", gap: 48, marginTop: 12 }}>
              <Stat label="Books" value={String(s.book_count)} />
              {range && <Stat label="Years" value={range} />}
              {s.universe_name && <Stat label="Universe" value={s.universe_name} />}
            </div>
          </div>
        </Frame>
      ),
      OG_SIZE
    );
  } catch {
    return new ImageResponse(<Fallback />, OG_SIZE);
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 44, fontWeight: 700, color: BRAND.textPrimary }}>
        {value}
      </span>
      <span style={{ fontSize: 18, color: BRAND.textSubtle }}>{label}</span>
    </div>
  );
}
