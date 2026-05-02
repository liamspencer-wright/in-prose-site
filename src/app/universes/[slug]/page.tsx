import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/lib/seo/json-ld";
import {
  itemListSchema,
  faqPageSchema,
  breadcrumbListSchema,
  siteId,
  SITE_URL,
} from "@/lib/seo/schema";

export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
};

type Universe = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  series_count: number;
  standalone_book_count: number;
};

type SeriesEntry = {
  position: number;
  series_id: string;
  name: string;
  slug: string;
  book_count: number;
  cover_isbn13: string | null;
};

type StandaloneEntry = {
  position: number;
  isbn13: string | null;
  title: string | null;
  image: string | null;
  pub_year: number | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const universe = await fetchUniverse(slug);
  if (!universe) return { title: "Universe not found", robots: { index: false } };

  const lead = buildUniverseLead(universe);

  return {
    title: `${universe.name} — Series, books, and reading order`,
    description: lead,
    alternates: {
      canonical: `/universes/${universe.slug}`,
      types: {
        "text/markdown": `/universes/${universe.slug}/llms.txt`,
      },
    },
    openGraph: {
      title: universe.name,
      description: lead,
      url: `${SITE_URL}/universes/${universe.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: universe.name,
      description: lead,
    },
  };
}

export default async function UniversePage({ params }: Props) {
  const { slug } = await params;
  const universe = await fetchUniverse(slug);
  if (!universe) notFound();

  const [seriesList, standalones] = await Promise.all([
    fetchUniverseSeries(universe.id),
    fetchUniverseStandalones(universe.id),
  ]);

  if (seriesList.length === 0 && standalones.length === 0) notFound();

  const lead = buildUniverseLead(universe);
  const faq = buildUniverseFaq(universe, seriesList);

  const itemUrls = [
    ...seriesList.map((s) => ({
      url: siteId(`/series/${s.slug}`),
      name: s.name,
    })),
    ...standalones
      .filter((b) => b.isbn13)
      .map((b) => ({
        url: siteId(`/book/${b.isbn13}`),
        name: b.title ?? "Untitled",
      })),
  ];

  const schemas = [
    itemListSchema({
      name: `${universe.name} reading order`,
      description: lead,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      items: itemUrls,
    }),
    breadcrumbListSchema([
      { name: "Home", url: SITE_URL },
      { name: universe.name, url: siteId(`/universes/${universe.slug}`) },
    ]),
    ...(faq.length > 0 ? [faqPageSchema(faq)] : []),
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 max-sm:px-4">
      <JsonLd schemas={schemas} />

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-text-muted">
        <Link href="/" className="hover:text-text-primary">
          Home
        </Link>
        {" / "}
        <span>{universe.name}</span>
      </nav>

      <header className="mb-10">
        <span className="text-xs uppercase tracking-wider text-accent">
          Universe
        </span>
        <h1 className="mt-2 text-4xl font-bold leading-tight max-sm:text-3xl">
          {universe.name}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-text-muted">{lead}</p>
        {universe.description && (
          <p className="mt-3 leading-relaxed text-text-muted">
            {universe.description}
          </p>
        )}
      </header>

      {seriesList.length > 0 && (
        <section id="series" className="mb-12">
          <h2 className="mb-4 text-2xl font-bold">Series in this universe</h2>
          <ul className="space-y-3">
            {seriesList.map((s) => (
              <li
                key={s.series_id}
                className="rounded-(--radius-card) border border-border-subtle bg-bg-medium p-4"
              >
                <Link href={`/series/${s.slug}`} className="flex items-center gap-4">
                  <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-(--radius-input) bg-bg-light">
                    {s.cover_isbn13 && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`https://images.isbndb.com/covers/${s.cover_isbn13}.jpg`}
                        alt={s.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold hover:text-accent">{s.name}</p>
                    <p className="text-sm text-text-subtle">
                      {s.book_count} {s.book_count === 1 ? "book" : "books"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {standalones.length > 0 && (
        <section id="standalones" className="mb-12">
          <h2 className="mb-4 text-2xl font-bold">Standalone books</h2>
          <ul className="grid grid-cols-3 gap-5 max-sm:grid-cols-2">
            {standalones.map((b, i) => (
              <li key={`${b.position}-${b.isbn13 ?? i}`}>
                {b.isbn13 ? (
                  <Link href={`/book/${b.isbn13}`} className="group block">
                    <div className="aspect-[2/3] overflow-hidden rounded-(--radius-input) bg-bg-medium">
                      {b.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={b.image}
                          alt={b.title ?? "Book cover"}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-tight">
                      {b.title ?? "Untitled"}
                    </p>
                    {b.pub_year && (
                      <p className="text-xs text-text-subtle">{b.pub_year}</p>
                    )}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

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
        <Link href="/" className="text-accent hover:underline">
          in prose — Books and data, perfectly bound.
        </Link>
      </p>
    </div>
  );
}

// ── Data fetching ──

async function fetchUniverse(slug: string): Promise<Universe | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_universe_by_slug", { p_slug: slug })
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Universe;
  return {
    ...row,
    series_count: Number(row.series_count),
    standalone_book_count: Number(row.standalone_book_count),
  };
}

async function fetchUniverseSeries(universeId: string): Promise<SeriesEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_universe_series", {
    p_universe_id: universeId,
  });
  if (error || !data) return [];
  return (data as SeriesEntry[]).map((s) => ({
    ...s,
    position: Number(s.position),
    book_count: Number(s.book_count),
  }));
}

async function fetchUniverseStandalones(
  universeId: string
): Promise<StandaloneEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_universe_standalones", {
    p_universe_id: universeId,
  });
  if (error || !data) return [];
  return (data as StandaloneEntry[]).map((b) => ({
    ...b,
    position: Number(b.position),
  }));
}

// ── Helpers ──

function buildUniverseLead(universe: Universe): string {
  const parts: string[] = [];
  parts.push(`${universe.name} is a shared world`);
  if (universe.series_count > 0) {
    parts.push(
      `containing ${universe.series_count} ${
        universe.series_count === 1 ? "series" : "series"
      }`
    );
  }
  if (universe.standalone_book_count > 0) {
    parts.push(
      `${universe.standalone_book_count} standalone ${
        universe.standalone_book_count === 1 ? "book" : "books"
      }`
    );
  }
  return parts.join(", ") + ".";
}

function buildUniverseFaq(
  universe: Universe,
  seriesList: SeriesEntry[]
): Array<{ question: string; answer: string }> {
  const qa: Array<{ question: string; answer: string }> = [];

  if (seriesList.length > 0) {
    qa.push({
      question: `Where should I start with ${universe.name}?`,
      answer: `Most readers start with ${seriesList[0].name} — the first series in the canonical reading order. See the series pages for in-series order.`,
    });
  }

  qa.push({
    question: `How many books are in ${universe.name}?`,
    answer: `${universe.name} has ${universe.series_count} ${
      universe.series_count === 1 ? "series" : "series"
    } and ${universe.standalone_book_count} standalone ${
      universe.standalone_book_count === 1 ? "book" : "books"
    } tracked on in prose.`,
  });

  return qa;
}
