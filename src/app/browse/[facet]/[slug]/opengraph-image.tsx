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
export const alt = "In Prose browse";

const SUPPORTED_FACETS = new Set([
  "genre",
  "mood",
  "vibe",
  "theme",
  "pace",
  "tone",
]);

type Props = {
  params: { facet: string; slug: string };
};

export default async function BrowseOgImage({ params }: Props) {
  try {
    if (!SUPPORTED_FACETS.has(params.facet)) {
      return new ImageResponse(<Fallback />, OG_SIZE);
    }

    const supabase = await createClient();
    const { data: facetIndex } = await supabase.rpc(
      "get_browse_facets_for_sitemap"
    );
    type FacetEntry = {
      facet: string;
      slug: string;
      value_label: string;
      total: number;
    };
    const match = ((facetIndex ?? []) as FacetEntry[]).find(
      (r) => r.facet === params.facet && r.slug === params.slug
    );
    if (!match) return new ImageResponse(<Fallback />, OG_SIZE);

    const heading =
      params.facet === "genre"
        ? `${capitalise(match.value_label)} books`
        : capitalise(match.value_label);

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
              Browse · {params.facet}
            </span>
            <span
              style={{
                fontSize: 96,
                fontWeight: 700,
                lineHeight: 1.0,
                color: BRAND.textPrimary,
              }}
            >
              {heading}
            </span>
            <span
              style={{ marginTop: 12, fontSize: 36, color: BRAND.textMuted }}
            >
              {Number(match.total)} {Number(match.total) === 1 ? "book" : "books"} on in prose
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

function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
