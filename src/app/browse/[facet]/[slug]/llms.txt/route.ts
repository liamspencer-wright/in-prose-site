import { createClient } from "@/lib/supabase/server";

const SITE_URL = "https://inprose.co.uk";

const SUPPORTED_FACETS = new Set([
  "genre",
  "mood",
  "vibe",
  "theme",
  "pace",
  "tone",
]);

type Props = {
  params: Promise<{ facet: string; slug: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const { facet, slug } = await params;
  if (!SUPPORTED_FACETS.has(facet)) {
    return notFoundResponse();
  }

  const supabase = await createClient();

  let label = "";
  let total = 0;
  type BookRow = {
    isbn13: string;
    title: string | null;
    pub_year: number | null;
    first_author_name: string | null;
    votes: number;
  };
  let books: BookRow[] = [];

  if (facet === "genre") {
    const { data } = await supabase.rpc("get_books_by_genre", {
      p_slug: slug,
      p_limit: 60,
    });
    type GenreRow = BookRow & {
      genre_label: string | null;
      total_in_genre: number;
    };
    const rows = (data ?? []) as GenreRow[];
    if (rows.length === 0) return notFoundResponse();
    label = rows[0].genre_label ?? slug;
    total = Number(rows[0].total_in_genre ?? rows.length);
    books = rows;
  } else {
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
      (r) => r.facet === facet && r.slug === slug
    );
    if (!match) return notFoundResponse();
    label = match.value_label;

    const { data } = await supabase.rpc("get_books_by_enrichment_facet", {
      p_facet_key: facet,
      p_value: match.value_label,
      p_limit: 60,
    });
    type EnrichmentRow = BookRow & { total_for_value: number };
    const rows = (data ?? []) as EnrichmentRow[];
    if (rows.length === 0) return notFoundResponse();
    total = Number(rows[0].total_for_value ?? rows.length);
    books = rows;
  }

  if (books.length < 5) return notFoundResponse();

  const lines: string[] = [];
  const heading =
    facet === "genre" ? `${capitalise(label)} books` : `${capitalise(label)} books — by ${facet}`;
  lines.push(`# ${heading}`);
  lines.push("");
  lines.push(`Source: ${SITE_URL}/browse/${facet}/${slug}`);
  lines.push("");
  lines.push(`- Facet: ${facet}`);
  lines.push(`- Value: ${label}`);
  lines.push(`- Books on in prose: ${total}`);
  lines.push("");
  lines.push("## Top books");
  lines.push("");
  for (const b of books) {
    const yearTag = b.pub_year ? ` (${b.pub_year})` : "";
    const authorTag = b.first_author_name ? ` by ${b.first_author_name}` : "";
    const votesTag =
      facet !== "genre" && b.votes > 0 ? ` — ${b.votes} community votes` : "";
    lines.push(
      `- [${b.title ?? "Untitled"}${yearTag}](${SITE_URL}/book/${b.isbn13})${authorTag}${votesTag}`
    );
  }

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control":
        "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

function notFoundResponse() {
  return new Response("Not found\n", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
