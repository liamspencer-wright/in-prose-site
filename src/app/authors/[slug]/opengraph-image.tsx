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
export const alt = "In Prose author";

type Props = {
  params: { slug: string };
};

export default async function AuthorOgImage({ params }: Props) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .rpc("get_author_by_slug", { p_slug: params.slug })
      .maybeSingle();

    if (!data) return new ImageResponse(<Fallback />, OG_SIZE);

    const a = data as {
      name: string;
      book_count: number;
      earliest_year: number | null;
      latest_year: number | null;
      top_genres: string[] | null;
    };

    const range =
      a.earliest_year && a.latest_year
        ? a.earliest_year === a.latest_year
          ? `${a.earliest_year}`
          : `${a.earliest_year}–${a.latest_year}`
        : null;

    const genre = a.top_genres?.[0] ?? null;

    return new ImageResponse(
      (
        <Frame>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              width: "100%",
            }}
          >
            <span
              style={{
                fontSize: 22,
                textTransform: "uppercase",
                letterSpacing: 1.6,
                color: BRAND.accent,
              }}
            >
              Author
            </span>
            <span
              style={{
                fontSize: 96,
                fontWeight: 700,
                lineHeight: 1.0,
                color: BRAND.textPrimary,
              }}
            >
              {a.name}
            </span>
            <div style={{ display: "flex", gap: 48, marginTop: 12 }}>
              <Stat label="Books" value={String(a.book_count)} />
              {range && <Stat label="Years" value={range} />}
              {genre && <Stat label="Genre" value={genre} />}
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
      <span style={{ fontSize: 48, fontWeight: 700, color: BRAND.textPrimary }}>
        {value}
      </span>
      <span style={{ fontSize: 18, color: BRAND.textSubtle }}>{label}</span>
    </div>
  );
}
