import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/lib/seo/json-ld";
import {
  itemListSchema,
  breadcrumbListSchema,
  faqPageSchema,
  siteId,
  SITE_URL,
} from "@/lib/seo/schema";
import { parseListSlug } from "@/lib/seo/lists";

export const revalidate = 3600;

const MIN_BOOKS = 10;

type Props = {
  params: Promise<{ slug: string }>;
};

type Book = {
  isbn13: string;
  title: string | null;
  image: string | null;
  pub_year: number | null;
  first_author_name: string | null;
  avg_rating: number | null;
  rating_count: number | null;
};

type ListPage = {
  slug: string;
  title: string;
  lead: string;
  total: number;
  books: Book[];
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchList(slug);
  if (!page || page.books.length < MIN_BOOKS) {
    return { title: "List not found", robots: { index: false } };
  }

  return {
    title: page.title,
    description: page.lead,
    alternates: {
      canonical: `/lists/${page.slug}`,
      types: { "text/markdown": `/lists/${page.slug}/llms.txt` },
    },
    openGraph: {
      title: page.title,
      description: page.lead,
      url: `${SITE_URL}/lists/${page.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.lead,
    },
  };
}

export default async function ListPageRoute({ params }: Props) {
  const { slug } = await params;
  const page = await fetchList(slug);
  if (!page || page.books.length < MIN_BOOKS) notFound();

  const faq = buildFaq(page);
  const schemas = [
    itemListSchema({
      name: page.title,
      description: page.lead,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      items: page.books.map((b, i) => ({
        url: siteId(`/book/${b.isbn13}`),
        name: b.title ?? "Untitled",
        position: i + 1,
      })),
    }),
    breadcrumbListSchema([
      { name: "Home", url: SITE_URL },
      { name: "Book lists", url: siteId("/lists") },
      { name: page.title, url: siteId(`/lists/${page.slug}`) },
    ]),
    ...(faq.length > 0 ? [faqPageSchema(faq)] : []),
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 max-sm:px-4">
      <JsonLd schemas={schemas} />

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-text-muted">
        <Link href="/" className="hover:text-text-primary">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/lists" className="hover:text-text-primary">
          Book lists
        </Link>{" "}
        / <span>{page.title}</span>
      </nav>

      <header className="mb-10">
        <span className="text-xs uppercase tracking-wider text-accent">
          Book list
        </span>
        <h1 className="mt-2 text-4xl font-bold leading-tight max-sm:text-3xl">
          {page.title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-text-muted">{page.lead}</p>
      </header>

      <section id="books" className="mb-12">
        <ol className="space-y-4">
          {page.books.map((b, i) => (
            <li
              key={b.isbn13}
              className="flex items-start gap-4 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-4"
            >
              <span className="w-10 flex-shrink-0 text-center text-2xl font-bold text-accent">
                {i + 1}
              </span>
              <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-(--radius-input) bg-bg-light">
                {b.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={b.image}
                    alt={b.title ?? "Book cover"}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">
                  <Link href={`/book/${b.isbn13}`} className="hover:text-accent">
                    {b.title ?? "Untitled"}
                  </Link>
                </p>
                {b.first_author_name && (
                  <p className="text-sm text-text-muted">{b.first_author_name}</p>
                )}
                <p className="mt-1 text-sm text-text-subtle">
                  {b.pub_year && <span>{b.pub_year}</span>}
                  {b.avg_rating !== null && b.avg_rating > 0 && (
                    <span>
                      {b.pub_year ? " · " : ""}★ {Number(b.avg_rating).toFixed(1)}
                    </span>
                  )}
                  {b.rating_count !== null && b.rating_count > 0 && (
                    <span>
                      {" "}({b.rating_count} {b.rating_count === 1 ? "rating" : "ratings"})
                    </span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {faq.length > 0 && (
        <section id="faq" className="mb-12">
          <h2 className="mb-4 text-2xl font-bold">Frequently asked</h2>
          <dl className="space-y-4">
            {faq.map((q) => (
              <div key={q.question}>
                <dt className="font-semibold">{q.question}</dt>
                <dd className="mt-1 text-text-muted">{q.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <p className="mt-12 text-center text-sm text-text-subtle">
        <Link href="/lists" className="text-accent hover:underline">
          ← All book lists
        </Link>
      </p>
    </div>
  );
}

// ── Data fetching ──

async function fetchList(slug: string): Promise<ListPage | null> {
  const spec = parseListSlug(slug);
  if (!spec) return null;

  const supabase = await createClient();

  if (spec.kind === "top-rated-genre") {
    const { data, error } = await supabase.rpc("get_top_rated_by_genre", {
      p_slug: spec.genreSlug,
      p_limit: 30,
    });
    if (error || !data) return null;
    type Row = Book & { genre_label: string | null; total_in_genre: number };
    const rows = (data as Row[]).map((r) => ({
      ...r,
      avg_rating: r.avg_rating !== null ? Number(r.avg_rating) : null,
      rating_count: r.rating_count !== null ? Number(r.rating_count) : null,
    }));
    if (rows.length === 0) return null;
    const genre = rows[0].genre_label ?? spec.genreSlug;
    const total = Number(rows[0].total_in_genre ?? rows.length);
    return {
      slug,
      title: `Top-rated ${genre.toLowerCase()} books`,
      lead: `The highest-rated ${genre.toLowerCase()} books on in prose, ranked by a Bayesian-weighted score across community ratings. ${total} ${
        total === 1 ? "title qualifies" : "titles qualify"
      } with at least 2 ratings each.`,
      total,
      books: rows,
    };
  }

  if (spec.kind === "best-of-year") {
    const { data, error } = await supabase.rpc("get_best_of_year", {
      p_year: spec.year,
      p_limit: 30,
    });
    if (error || !data) return null;
    type Row = Book & { total_for_year: number };
    const rows = (data as Row[]).map((r) => ({
      ...r,
      avg_rating: r.avg_rating !== null ? Number(r.avg_rating) : null,
      rating_count: r.rating_count !== null ? Number(r.rating_count) : null,
    }));
    if (rows.length === 0) return null;
    const total = Number(rows[0].total_for_year ?? rows.length);
    return {
      slug,
      title: `Best books of ${spec.year}`,
      lead: `The highest-rated books published in ${spec.year} on in prose, ranked by a Bayesian-weighted score. ${total} ${
        total === 1 ? "title qualifies" : "titles qualify"
      } with at least 2 ratings each.`,
      total,
      books: rows,
    };
  }

  return null;
}

function buildFaq(page: ListPage): Array<{ question: string; answer: string }> {
  return [
    {
      question: "How is this list ranked?",
      answer:
        "Each book's score is a Bayesian-weighted average of community ratings: average rating × number of ratings + a small global-average prior, divided by the rating count + 5. The prior prevents single 10/10 ratings from dominating low-vote books.",
    },
    {
      question: "When is this list updated?",
      answer:
        "Computed lists refresh automatically — every page load reflects the current state of community ratings on in prose.",
    },
    {
      question: "How many books qualify?",
      answer: `${page.total} ${
        page.total === 1 ? "book has" : "books have"
      } enough public community ratings to qualify for this list.`,
    },
  ];
}
