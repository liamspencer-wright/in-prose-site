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

export const revalidate = 3600;

// Thin-content guard: every browse page must have at least this many qualifying
// books. Otherwise notFound() (which inherits noindex from app/not-found.tsx).
const MIN_BOOKS = 5;

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

type GenreRow = {
  isbn13: string;
  title: string | null;
  image: string | null;
  pub_year: number | null;
  first_author_name: string | null;
  votes: number;
  genre_label: string | null;
  total_in_genre: number;
};

type EnrichmentRow = {
  isbn13: string;
  title: string | null;
  image: string | null;
  pub_year: number | null;
  first_author_name: string | null;
  votes: number;
  total_for_value: number;
};

type Page = {
  facet: string;
  slug: string;
  label: string;
  total: number;
  books: Array<{
    isbn13: string;
    title: string | null;
    image: string | null;
    pub_year: number | null;
    author: string | null;
    votes: number;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { facet, slug } = await params;
  if (!SUPPORTED_FACETS.has(facet)) {
    return { title: "Browse not found", robots: { index: false } };
  }

  const page = await fetchPage(facet, slug);
  if (!page || page.books.length < MIN_BOOKS) {
    return { title: "Browse not found", robots: { index: false } };
  }

  const title = formatTitle(page.facet, page.label);
  const description = formatLead(page);

  return {
    title,
    description,
    alternates: {
      canonical: `/browse/${page.facet}/${page.slug}`,
      types: {
        "text/markdown": `/browse/${page.facet}/${page.slug}/llms.txt`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/browse/${page.facet}/${page.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function BrowseFacetPage({ params }: Props) {
  const { facet, slug } = await params;
  if (!SUPPORTED_FACETS.has(facet)) notFound();

  const page = await fetchPage(facet, slug);
  if (!page || page.books.length < MIN_BOOKS) notFound();

  const lead = formatLead(page);
  const faq = buildFaq(page);
  const schemas = [
    itemListSchema({
      name: formatTitle(page.facet, page.label),
      description: lead,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      items: page.books.map((b, i) => ({
        url: siteId(`/book/${b.isbn13}`),
        name: b.title ?? "Untitled",
        position: i + 1,
      })),
    }),
    breadcrumbListSchema([
      { name: "Home", url: SITE_URL },
      { name: "Browse", url: siteId("/browse") },
      {
        name: formatTitle(page.facet, page.label),
        url: siteId(`/browse/${page.facet}/${page.slug}`),
      },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      "@id": siteId(`/browse/${page.facet}/${page.slug}#term`),
      name: page.label,
      inDefinedTermSet: page.facet,
      url: siteId(`/browse/${page.facet}/${page.slug}`),
    },
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
        <Link href="/browse" className="hover:text-text-primary">
          Browse
        </Link>{" "}
        / <span className="capitalize">{page.label}</span>
      </nav>

      <header className="mb-10">
        <span className="text-xs uppercase tracking-wider text-accent">
          {page.facet}
        </span>
        <h1 className="mt-2 text-4xl font-bold leading-tight max-sm:text-3xl">
          {formatTitle(page.facet, page.label)}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-text-muted">{lead}</p>
      </header>

      <section id="books" className="mb-12">
        <ul className="grid grid-cols-3 gap-5 max-sm:grid-cols-2">
          {page.books.map((b) => (
            <li key={b.isbn13}>
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
                {b.author && (
                  <p className="text-xs text-text-muted">{b.author}</p>
                )}
                {b.pub_year && (
                  <p className="text-xs text-text-subtle">{b.pub_year}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
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
        <Link href="/browse" className="text-accent hover:underline">
          ← All browse facets
        </Link>
      </p>
    </div>
  );
}

// ── Data fetching ──

async function fetchPage(facet: string, slug: string): Promise<Page | null> {
  const supabase = await createClient();

  if (facet === "genre") {
    const { data, error } = await supabase.rpc("get_books_by_genre", {
      p_slug: slug,
      p_limit: 60,
    });
    if (error || !data) return null;
    const rows = data as GenreRow[];
    if (rows.length === 0) return null;
    return {
      facet,
      slug,
      label: rows[0].genre_label ?? slug,
      total: Number(rows[0].total_in_genre ?? rows.length),
      books: rows.map((r) => ({
        isbn13: r.isbn13,
        title: r.title,
        image: r.image,
        pub_year: r.pub_year,
        author: r.first_author_name,
        votes: 0,
      })),
    };
  }

  // Enrichment facets — value comes from the slug. Map slug back to a label
  // by consulting the sitemap feed; cheaper than fetching every survey option.
  const { data: facetIndex } = await supabase
    .rpc("get_browse_facets_for_sitemap");
  type FacetEntry = {
    facet: string;
    slug: string;
    value_label: string;
    total: number;
  };
  const match = ((facetIndex ?? []) as FacetEntry[]).find(
    (r) => r.facet === facet && r.slug === slug
  );
  if (!match) return null;

  const { data, error } = await supabase.rpc(
    "get_books_by_enrichment_facet",
    {
      p_facet_key: facet,
      p_value: match.value_label,
      p_limit: 60,
    }
  );
  if (error || !data) return null;
  const rows = data as EnrichmentRow[];
  if (rows.length === 0) return null;

  return {
    facet,
    slug,
    label: match.value_label,
    total: Number(rows[0].total_for_value ?? rows.length),
    books: rows.map((r) => ({
      isbn13: r.isbn13,
      title: r.title,
      image: r.image,
      pub_year: r.pub_year,
      author: r.first_author_name,
      votes: r.votes,
    })),
  };
}

// ── Helpers ──

function formatTitle(facet: string, label: string): string {
  if (facet === "genre") return `${capitalise(label)} books`;
  if (facet === "mood") return `${capitalise(label)} books — by mood`;
  return `${capitalise(label)} books — by ${facet}`;
}

function formatLead(page: Page): string {
  const facet = page.facet;
  const label = page.label.toLowerCase();
  if (facet === "genre") {
    return `${capitalise(
      label
    )} books on in prose, ranked by community signal — ${page.total} ${
      page.total === 1 ? "title" : "titles"
    } across the catalogue.`;
  }
  return `Books readers describe as ${label} on in prose, by ${facet} — ${page.total} ${
    page.total === 1 ? "title" : "titles"
  } with at least 2 community votes for this ${facet}.`;
}

function buildFaq(page: Page): Array<{ question: string; answer: string }> {
  const qa: Array<{ question: string; answer: string }> = [];
  const label = page.label.toLowerCase();

  if (page.facet === "genre") {
    qa.push({
      question: `What is the best ${label} book?`,
      answer: `The most-read ${label} books on in prose are ranked above. The list is updated as readers add and rate books.`,
    });
    qa.push({
      question: `How many ${label} books are there?`,
      answer: `in prose tracks ${page.total} ${label} ${
        page.total === 1 ? "book" : "books"
      } in this category.`,
    });
  } else {
    qa.push({
      question: `What makes a book ${label}?`,
      answer: `Books on in prose are tagged ${label} when at least two readers describe them that way in the post-read survey. The page surfaces titles with the highest agreement.`,
    });
    qa.push({
      question: `How many books are tagged ${label}?`,
      answer: `${page.total} ${
        page.total === 1 ? "book has" : "books have"
      } enough community votes to qualify as ${label}.`,
    });
  }
  return qa;
}

function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
