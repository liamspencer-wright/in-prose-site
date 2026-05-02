import { createClient } from "@/lib/supabase/server";

const SITE_URL = "https://inprose.co.uk";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: author } = await supabase
    .rpc("get_author_by_slug", { p_slug: slug })
    .maybeSingle();

  if (!author) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const a = author as {
    id: string;
    name: string;
    slug: string;
    book_count: number;
    earliest_year: number | null;
    latest_year: number | null;
    top_genres: string[] | null;
  };

  const { data: worksData } = await supabase.rpc("get_works_for_author", {
    p_author_id: a.id,
    p_limit: 60,
  });

  type Work = {
    isbn13: string;
    title: string | null;
    pub_year: number | null;
  };
  const works = (worksData ?? []) as Work[];

  const lines: string[] = [];
  lines.push(`# ${a.name}`);
  lines.push("");
  lines.push(`Source: ${SITE_URL}/authors/${a.slug}`);
  lines.push("");
  lines.push(`- Books tracked: ${a.book_count}`);
  if (a.earliest_year && a.latest_year) {
    lines.push(
      a.earliest_year === a.latest_year
        ? `- Published: ${a.earliest_year}`
        : `- Publication range: ${a.earliest_year}–${a.latest_year}`
    );
  }
  if (a.top_genres && a.top_genres.length > 0) {
    lines.push(`- Primary genres: ${a.top_genres.slice(0, 5).join(", ")}`);
  }
  lines.push("");

  if (works.length > 0) {
    lines.push("## Books");
    lines.push("");
    for (const w of works) {
      const yearTag = w.pub_year ? ` (${w.pub_year})` : "";
      lines.push(
        `- [${w.title ?? "Untitled"}${yearTag}](${SITE_URL}/book/${w.isbn13})`
      );
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
