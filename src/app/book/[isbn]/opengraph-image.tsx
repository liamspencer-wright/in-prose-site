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
export const alt = "In Prose book";

type Props = {
  params: { isbn: string };
};

export default async function BookOgImage({ params }: Props) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("books_expanded")
      .select("title, image, first_author_name, pub_year")
      .eq("isbn13", params.isbn)
      .maybeSingle();

    if (!data || !data.title) {
      return new ImageResponse(<Fallback />, OG_SIZE);
    }

    const cover = data.image ?? null;
    const title = (data.title as string).slice(0, 120);
    const author = (data.first_author_name as string | null) ?? null;
    const year = (data.pub_year as number | null) ?? null;

    return new ImageResponse(
      (
        <Frame>
          <div
            style={{
              display: "flex",
              gap: 48,
              alignItems: "center",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 280,
                height: 420,
                background: BRAND.bgMedium,
                borderRadius: 16,
                overflow: "hidden",
                flexShrink: 0,
                boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
              }}
            >
              {cover ? (
                /* eslint-disable-next-line jsx-a11y/alt-text */
                <img
                  src={cover}
                  width={280}
                  height={420}
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    color: BRAND.textSubtle,
                    fontSize: 18,
                  }}
                >
                  No cover
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                gap: 16,
              }}
            >
              <span
                style={{
                  fontSize: 64,
                  fontWeight: 700,
                  lineHeight: 1.05,
                  color: BRAND.textPrimary,
                }}
              >
                {title}
              </span>
              {author && (
                <span style={{ fontSize: 32, color: BRAND.textMuted }}>
                  {author}
                </span>
              )}
              {year && (
                <span style={{ fontSize: 24, color: BRAND.textSubtle }}>
                  {year}
                </span>
              )}
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
