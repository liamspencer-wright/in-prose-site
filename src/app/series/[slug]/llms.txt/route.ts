import { createClient } from "@/lib/supabase/server";

const SITE_URL = "https://inprose.co.uk";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: series } = await supabase
    .rpc("get_series_by_slug", { p_slug: slug })
    .maybeSingle();
  if (!series) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const s = series as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    book_count: number;
    earliest_year: number | null;
    latest_year: number | null;
    primary_author_name: string | null;
    universe_name: string | null;
    universe_slug: string | null;
  };

  const { data: members } = await supabase.rpc("get_series_members", {
    p_series_id: s.id,
  });

  type Member = {
    position: number;
    isbn13: string | null;
    title: string | null;
    pub_year: number | null;
    is_optional: boolean;
    notes: string | null;
  };

  const ms = (members ?? []) as Member[];

  const lines: string[] = [];
  lines.push(`# ${s.name}`);
  lines.push("");
  lines.push(`Source: ${SITE_URL}/series/${s.slug}`);
  lines.push("");
  if (s.primary_author_name) lines.push(`- Author: ${s.primary_author_name}`);
  lines.push(`- Books: ${s.book_count}`);
  if (s.earliest_year && s.latest_year) {
    lines.push(
      s.earliest_year === s.latest_year
        ? `- Published: ${s.earliest_year}`
        : `- Publication range: ${s.earliest_year}–${s.latest_year}`
    );
  }
  if (s.universe_name && s.universe_slug) {
    lines.push(`- Universe: [${s.universe_name}](${SITE_URL}/universes/${s.universe_slug})`);
  }
  if (s.description) {
    lines.push("");
    lines.push(s.description);
  }
  lines.push("");

  if (ms.length > 0) {
    lines.push("## Reading order");
    lines.push("");
    for (const m of ms) {
      const yearTag = m.pub_year ? ` (${m.pub_year})` : "";
      const optionalTag = m.is_optional ? " — optional" : "";
      const link = m.isbn13
        ? `[${m.title ?? "Untitled"}](${SITE_URL}/book/${m.isbn13})`
        : m.title ?? "Untitled";
      lines.push(`${formatPosition(m.position)}. ${link}${yearTag}${optionalTag}`);
      if (m.notes) lines.push(`   ${m.notes}`);
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

function formatPosition(p: number): string {
  if (Number.isInteger(p)) return String(p);
  return p.toFixed(1);
}
