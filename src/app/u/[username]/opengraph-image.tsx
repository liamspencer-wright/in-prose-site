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
export const alt = "In Prose reader";

type Props = {
  params: { username: string };
};

export default async function ProfileOgImage({ params }: Props) {
  try {
    const supabase = await createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, description")
      .ilike("username", params.username)
      .maybeSingle();

    if (!profile) return new ImageResponse(<Fallback />, OG_SIZE);

    // Public stat counts via cheap-ish queries.
    const [{ count: finishedCount }, { count: totalCount }] = await Promise.all([
      supabase
        .from("user_books_expanded_all")
        .select("isbn13", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("visibility", "public")
        .eq("status", "finished"),
      supabase
        .from("user_books_expanded_all")
        .select("isbn13", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("visibility", "public"),
    ]);

    const name = (profile.display_name as string | null) ?? (profile.username as string);
    const username = profile.username as string;
    const avatar = (profile.avatar_url as string | null) ?? null;
    const description = (profile.description as string | null) ?? null;

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
                width: 240,
                height: 240,
                borderRadius: 9999,
                overflow: "hidden",
                background: BRAND.bgMedium,
                flexShrink: 0,
              }}
            >
              {avatar ? (
                /* eslint-disable-next-line jsx-a11y/alt-text */
                <img src={avatar} width={240} height={240} style={{ objectFit: "cover" }} />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    fontSize: 96,
                    fontWeight: 700,
                    color: BRAND.textPrimary,
                  }}
                >
                  {(name ?? "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
              <span
                style={{
                  fontSize: 64,
                  fontWeight: 700,
                  color: BRAND.textPrimary,
                  lineHeight: 1.05,
                }}
              >
                {name}
              </span>
              <span style={{ fontSize: 28, color: BRAND.textMuted }}>
                @{username}
              </span>
              {description && (
                <span
                  style={{
                    marginTop: 8,
                    fontSize: 24,
                    color: BRAND.textMuted,
                    lineHeight: 1.3,
                  }}
                >
                  {description.slice(0, 140)}
                </span>
              )}
              <div style={{ display: "flex", gap: 32, marginTop: 24 }}>
                <Stat label="Finished" value={finishedCount ?? 0} />
                <Stat label="Public books" value={totalCount ?? 0} />
              </div>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 36, fontWeight: 700, color: BRAND.textPrimary }}>
        {value}
      </span>
      <span style={{ fontSize: 18, color: BRAND.textSubtle }}>{label}</span>
    </div>
  );
}
