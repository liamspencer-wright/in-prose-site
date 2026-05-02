import { createClient } from "@/lib/supabase/server";

const SITE_URL = "https://inprose.co.uk";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: universe } = await supabase
    .rpc("get_universe_by_slug", { p_slug: slug })
    .maybeSingle();
  if (!universe) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const u = universe as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    series_count: number;
    standalone_book_count: number;
  };

  const [{ data: seriesList }, { data: standalones }] = await Promise.all([
    supabase.rpc("get_universe_series", { p_universe_id: u.id }),
    supabase.rpc("get_universe_standalones", { p_universe_id: u.id }),
  ]);

  type S = { name: string; slug: string; book_count: number };
  type B = { isbn13: string | null; title: string | null; pub_year: number | null };

  const lines: string[] = [];
  lines.push(`# ${u.name}`);
  lines.push("");
  lines.push(`Source: ${SITE_URL}/universes/${u.slug}`);
  lines.push("");
  lines.push(`- Series: ${u.series_count}`);
  lines.push(`- Standalones: ${u.standalone_book_count}`);
  if (u.description) {
    lines.push("");
    lines.push(u.description);
  }
  lines.push("");

  if (seriesList && (seriesList as S[]).length > 0) {
    lines.push("## Series");
    lines.push("");
    for (const s of seriesList as S[]) {
      lines.push(
        `- [${s.name}](${SITE_URL}/series/${s.slug}) — ${s.book_count} ${
          s.book_count === 1 ? "book" : "books"
        }`
      );
    }
    lines.push("");
  }

  if (standalones && (standalones as B[]).length > 0) {
    lines.push("## Standalone books");
    lines.push("");
    for (const b of standalones as B[]) {
      const yearTag = b.pub_year ? ` (${b.pub_year})` : "";
      const link = b.isbn13
        ? `[${b.title ?? "Untitled"}](${SITE_URL}/book/${b.isbn13})`
        : b.title ?? "Untitled";
      lines.push(`- ${link}${yearTag}`);
    }
    lines.push("");
  }

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control":
        "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
