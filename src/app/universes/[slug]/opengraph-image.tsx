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
export const alt = "In Prose universe";

type Props = {
  params: { slug: string };
};

export default async function UniverseOgImage({ params }: Props) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .rpc("get_universe_by_slug", { p_slug: params.slug })
      .maybeSingle();

    if (!data) return new ImageResponse(<Fallback />, OG_SIZE);

    const u = data as {
      name: string;
      series_count: number;
      standalone_book_count: number;
    };

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
              Universe
            </span>
            <span
              style={{
                fontSize: 96,
                fontWeight: 700,
                lineHeight: 1.0,
                color: BRAND.textPrimary,
              }}
            >
              {u.name}
            </span>
            <div style={{ display: "flex", gap: 48, marginTop: 12 }}>
              <Stat label="Series" value={String(u.series_count)} />
              <Stat label="Standalones" value={String(u.standalone_book_count)} />
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
      <span style={{ fontSize: 56, fontWeight: 700, color: BRAND.textPrimary }}>
        {value}
      </span>
      <span style={{ fontSize: 20, color: BRAND.textSubtle }}>{label}</span>
    </div>
  );
}
