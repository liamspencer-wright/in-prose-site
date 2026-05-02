import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import {
  Frame,
  Fallback,
  BRAND,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/seo/og-template";
import { parseListSlug } from "@/lib/seo/lists";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "In Prose book list";

type Props = {
  params: { slug: string };
};

export default async function ListOgImage({ params }: Props) {
  try {
    const spec = parseListSlug(params.slug);
    if (!spec) return new ImageResponse(<Fallback />, OG_SIZE);

    const supabase = await createClient();

    let title = "";
    let total = 0;

    if (spec.kind === "top-rated-genre") {
      const { data } = await supabase
        .rpc("get_top_rated_by_genre", { p_slug: spec.genreSlug, p_limit: 1 });
      type GR = { genre_label: string | null; total_in_genre: number };
      const row = ((data ?? []) as GR[])[0];
      if (!row) return new ImageResponse(<Fallback />, OG_SIZE);
      title = `Top-rated ${(row.genre_label ?? spec.genreSlug).toLowerCase()} books`;
      total = Number(row.total_in_genre ?? 0);
    } else {
      const { data } = await supabase
        .rpc("get_best_of_year", { p_year: spec.year, p_limit: 1 });
      type YR = { total_for_year: number };
      const row = ((data ?? []) as YR[])[0];
      if (!row) return new ImageResponse(<Fallback />, OG_SIZE);
      title = `Best books of ${spec.year}`;
      total = Number(row.total_for_year ?? 0);
    }

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
              Book list
            </span>
            <span
              style={{
                fontSize: 88,
                fontWeight: 700,
                lineHeight: 1.0,
                color: BRAND.textPrimary,
              }}
            >
              {title}
            </span>
            <span
              style={{
                marginTop: 12,
                fontSize: 32,
                color: BRAND.textMuted,
              }}
            >
              {total} {total === 1 ? "book" : "books"} ranked by community ratings
            </span>
          </div>
        </Frame>
      ),
      OG_SIZE
    );
  } catch {
    return new ImageResponse(<Fallback />, OG_SIZE);
  }
}
