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

type Series = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  book_count: number;
  earliest_year: number | null;
  latest_year: number | null;
  primary_author_name: string | null;
  primary_author_slug: string | null;
  universe_id: string | null;
  universe_name: string | null;
  universe_slug: string | null;
};

type Member = {
  position: number;
  isbn13: string | null;
  title: string | null;
  image: string | null;
  pub_year: number | null;
  is_optional: boolean;
  notes: string | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const series = await fetchSeries(slug);
  if (!series) return { title: "Series not found", robots: { index: false } };

  const lead = buildSeriesLead(series);

  return {
    title: `${series.name} — Reading order, books, and series guide`,
    description: lead,
    alternates: {
      canonical: `/series/${series.slug}`,
      types: {
        "text/markdown": `/series/${series.slug}/llms.txt`,
      },
    },
    openGraph: {
      title: series.name,
      description: lead,
      url: `${SITE_URL}/series/${series.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: series.name,
      description: lead,
    },
  };
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params;
  const series = await fetchSeries(slug);
  if (!series) notFound();

  const members = await fetchSeriesMembers(series.id);
  if (members.length === 0) notFound();

  const lead = buildSeriesLead(series);
  const faq = buildSeriesFaq(series, members);
  const memberItems = members
    .filter((m) => m.isbn13)
    .map((m, i) => ({
      url: siteId(`/book/${m.isbn13}`),
      name: m.title ?? "Untitled",
      position: i + 1,
    }));

  const schemas = [
    itemListSchema({
      name: `${series.name} reading order`,
      description: lead,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      items: memberItems,
    }),
    breadcrumbListSchema([
      { name: "Home", url: SITE_URL },
      ...(series.universe_slug && series.universe_name
        ? [
            {
              name: series.universe_name,
              url: siteId(`/universes/${series.universe_slug}`),
            },
          ]
        : []),
      { name: series.name, url: siteId(`/series/${series.slug}`) },
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
        {series.universe_slug && (
          <>
            {" / "}
            <Link
              href={`/universes/${series.universe_slug}`}
              className="hover:text-text-primary"
            >
              {series.universe_name}
            </Link>
          </>
        )}
        {" / "}
        <span>{series.name}</span>
      </nav>

      <header className="mb-10">
        <span className="text-xs uppercase tracking-wider text-accent">
          Series
        </span>
        <h1 className="mt-2 text-4xl font-bold leading-tight max-sm:text-3xl">
          {series.name}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-text-muted">{lead}</p>
        {series.description && (
          <p className="mt-3 leading-relaxed text-text-muted">
            {series.description}
          </p>
        )}
      </header>

      <section id="reading-order" className="mb-12">
        <h2 className="mb-4 text-2xl font-bold">Reading order</h2>
        <ol className="space-y-4">
          {members.map((m, i) => (
            <li
              key={`${m.position}-${m.isbn13 ?? i}`}
              className="flex items-start gap-4 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-4"
            >
              <span className="text-2xl font-bold text-accent w-10 flex-shrink-0 text-center">
                {formatPosition(m.position)}
              </span>
              <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-(--radius-input) bg-bg-light">
                {m.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={m.image}
                    alt={m.title ?? "Book cover"}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">
                  {m.isbn13 ? (
                    <Link
                      href={`/book/${m.isbn13}`}
                      className="hover:text-accent"
                    >
                      {m.title ?? "Untitled"}
                    </Link>
                  ) : (
                    m.title ?? "Untitled"
                  )}
                  {m.is_optional && (
                    <span className="ml-2 text-xs font-normal text-text-subtle">
                      optional
                    </span>
                  )}
                </p>
                {m.pub_year && (
                  <p className="text-sm text-text-subtle">{m.pub_year}</p>
                )}
                {m.notes && (
                  <p className="mt-1 text-sm text-text-muted">{m.notes}</p>
                )}
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
        <Link href="/" className="text-accent hover:underline">
          in prose — Books and data, perfectly bound.
        </Link>
      </p>
    </div>
  );
}

// ── Data fetching ──

async function fetchSeries(slug: string): Promise<Series | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_series_by_slug", { p_slug: slug })
    .maybeSingle();
  if (error || !data) return null;
  return data as Series;
}

async function fetchSeriesMembers(seriesId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_series_members", {
    p_series_id: seriesId,
  });
  if (error || !data) return [];
  // RPC returns column `pos`; remap to local `position` for UI code.
  type Row = Omit<Member, "position"> & { pos: number };
  return (data as Row[]).map((m) => ({
    ...m,
    position: Number(m.pos),
  }));
}

// ── Helpers ──

function formatPosition(p: number): string {
  // Whole numbers render as "1, 2, 3"; fractional positions ("Secret History"
  // = 6.5) render with one decimal.
  if (Number.isInteger(p)) return String(p);
  return p.toFixed(1);
}

function buildSeriesLead(series: Series): string {
  const parts: string[] = [];
  parts.push(
    `${series.name} is a ${series.book_count}-book series${
      series.primary_author_name ? ` by ${series.primary_author_name}` : ""
    }`
  );
  if (series.earliest_year && series.latest_year) {
    parts.push(
      series.earliest_year === series.latest_year
        ? `published in ${series.earliest_year}`
        : `published between ${series.earliest_year} and ${series.latest_year}`
    );
  }
  if (series.universe_name) {
    parts.push(`set in the ${series.universe_name} universe`);
  }
  return parts.join(", ") + ".";
}

function buildSeriesFaq(
  series: Series,
  members: Member[]
): Array<{ question: string; answer: string }> {
  const qa: Array<{ question: string; answer: string }> = [];
  const first = members[0];

  if (first?.title) {
    qa.push({
      question: `Where should I start with ${series.name}?`,
      answer: `Start with ${first.title}${
        first.pub_year ? ` (${first.pub_year})` : ""
      } — the first book in publication order.`,
    });
  }

  qa.push({
    question: `How many books are in ${series.name}?`,
    answer: `${series.name} has ${series.book_count} ${
      series.book_count === 1 ? "book" : "books"
    } tracked on in prose.`,
  });

  if (series.primary_author_name) {
    qa.push({
      question: `Who wrote ${series.name}?`,
      answer: `${series.name} is written by ${series.primary_author_name}.`,
    });
  }

  if (series.universe_name) {
    qa.push({
      question: `Is ${series.name} part of a larger universe?`,
      answer: `Yes — ${series.name} is set in the ${series.universe_name} universe, which contains other series and standalone books.`,
    });
  }

  return qa;
}
