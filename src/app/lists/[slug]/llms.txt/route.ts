import { createClient } from "@/lib/supabase/server";
import { parseListSlug } from "@/lib/seo/lists";

const SITE_URL = "https://inprose.co.uk";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;
  const spec = parseListSlug(slug);
  if (!spec) return notFoundResponse();

  const supabase = await createClient();

  type Row = {
    isbn13: string;
    title: string | null;
    pub_year: number | null;
    first_author_name: string | null;
    avg_rating: number | null;
    rating_count: number | null;
  };

  let title = "";
  let lead = "";
  let books: Row[] = [];

  if (spec.kind === "top-rated-genre") {
    const { data } = await supabase.rpc("get_top_rated_by_genre", {
      p_slug: spec.genreSlug,
      p_limit: 30,
    });
    type GR = Row & { genre_label: string | null };
    const rows = (data ?? []) as GR[];
    if (rows.length === 0) return notFoundResponse();
    const genre = rows[0].genre_label ?? spec.genreSlug;
    title = `Top-rated ${genre.toLowerCase()} books`;
    lead = `Bayesian-weighted ranking of ${genre.toLowerCase()} books on in prose with at least 2 community ratings.`;
    books = rows;
  } else if (spec.kind === "best-of-year") {
    const { data } = await supabase.rpc("get_best_of_year", {
      p_year: spec.year,
      p_limit: 30,
    });
    const rows = (data ?? []) as Row[];
    if (rows.length === 0) return notFoundResponse();
    title = `Best books of ${spec.year}`;
    lead = `Bayesian-weighted ranking of books published in ${spec.year} with at least 2 community ratings.`;
    books = rows;
  }

  if (books.length < 10) return notFoundResponse();

  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`Source: ${SITE_URL}/lists/${slug}`);
  lines.push("");
  lines.push(lead);
  lines.push("");
  lines.push("## Ranked books");
  lines.push("");
  books.forEach((b, i) => {
    const yearTag = b.pub_year ? ` (${b.pub_year})` : "";
    const authorTag = b.first_author_name ? ` by ${b.first_author_name}` : "";
    const ratingTag =
      b.avg_rating !== null && b.avg_rating > 0
        ? ` — ★ ${Number(b.avg_rating).toFixed(1)} (${b.rating_count ?? 0} ratings)`
        : "";
    lines.push(
      `${i + 1}. [${b.title ?? "Untitled"}${yearTag}](${SITE_URL}/book/${b.isbn13})${authorTag}${ratingTag}`
    );
  });

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
