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
export const alt = "In Prose article";

type Props = {
  params: { slug: string };
};

export default async function NewsOgImage({ params }: Props) {
  try {
    const supabase = await createClient();
    const { data: post } = await supabase
      .from("news_posts")
      .select("title, excerpt, cover_image_url, image_urls, published_at, type")
      .eq("slug", params.slug)
      .eq("status", "published")
      .maybeSingle();

    if (!post) return new ImageResponse(<Fallback />, OG_SIZE);

    const cover = (post.cover_image_url as string | null) ?? (post.image_urls as string[] | null)?.[0] ?? null;
    const title = (post.title as string).slice(0, 140);
    const excerpt = (post.excerpt as string | null)?.slice(0, 180) ?? null;
    const date = post.published_at
      ? new Date(post.published_at as string).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;
    const typeLabel = formatType((post.type as string) ?? "article");

    return new ImageResponse(
      (
        <Frame background={cover ? BRAND.textPrimary : BRAND.bgLight}>
          {cover ? (
            <div style={{ display: "flex", width: "100%", position: "relative" }}>
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  inset: -60,
                  filter: "brightness(0.4) blur(2px)",
                }}
              >
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <img
                  src={cover}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  color: "#fff",
                  gap: 16,
                  width: "100%",
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    textTransform: "uppercase",
                    letterSpacing: 1.6,
                    color: "#ffb98a",
                  }}
                >
                  {typeLabel}
                </span>
                <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05 }}>
                  {title}
                </span>
                {excerpt && (
                  <span style={{ fontSize: 26, opacity: 0.85, lineHeight: 1.3 }}>
                    {excerpt}
                  </span>
                )}
                {date && (
                  <span style={{ marginTop: 16, fontSize: 20, opacity: 0.7 }}>
                    {date}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                gap: 16,
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
                {typeLabel}
              </span>
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
              {excerpt && (
                <span style={{ fontSize: 26, color: BRAND.textMuted, lineHeight: 1.3 }}>
                  {excerpt}
                </span>
              )}
              {date && (
                <span style={{ marginTop: 16, fontSize: 20, color: BRAND.textSubtle }}>
                  {date}
                </span>
              )}
            </div>
          )}
        </Frame>
      ),
      OG_SIZE
    );
  } catch {
    return new ImageResponse(<Fallback />, OG_SIZE);
  }
}

function formatType(t: string): string {
  return t
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
