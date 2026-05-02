import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/lib/seo/json-ld";
import {
  personSchema,
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

type AuthorRow = {
  id: string;
  name: string;
  sort_name: string | null;
  slug: string;
  book_count: number;
  earliest_year: number | null;
  latest_year: number | null;
  top_genres: string[] | null;
};

type Work = {
  isbn13: string;
  title: string | null;
  image: string | null;
  date_published: string | null;
  pub_year: number | null;
  pages: number | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await fetchAuthor(slug);
  if (!author) return { title: "Author not found", robots: { index: false } };

  const lead = buildLead(author);

  return {
    title: `${author.name} — Books and reading order`,
    description: lead,
    alternates: {
      canonical: `/authors/${author.slug}`,
      types: {
        "text/markdown": `/authors/${author.slug}/llms.txt`,
      },
    },
    openGraph: {
      title: author.name,
      description: lead,
      url: `${SITE_URL}/authors/${author.slug}`,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: author.name,
      description: lead,
    },
  };
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;
  const author = await fetchAuthor(slug);
  if (!author) notFound();

  // Redirect canonical-slug drift: if a stale slug points here, send to current slug.
  if (slug !== author.slug) {
    return (
      <meta httpEquiv="refresh" content={`0; url=/authors/${author.slug}`} />
    );
  }

  const works = await fetchWorks(author.id, 60);

  if (works.length === 0) {
    // Thin-content guard: noindex via metadata wouldn't catch this branch
    // because metadata runs separately. Keep render minimal — crawlers see
    // the page but the explicit notFound below upholds the policy.
    notFound();
  }

  const lead = buildLead(author);
  const faq = buildAuthorFaq(author, works);
  const schemas = [
    personSchema({
      username: author.slug,
      displayName: author.name,
      description: lead,
    }),
    itemListSchema({
      name: `Books by ${author.name}`,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      items: works.map((w) => ({
        url: siteId(`/book/${w.isbn13}`),
        name: w.title ?? "Untitled",
      })),
    }),
    breadcrumbListSchema([
      { name: "Home", url: SITE_URL },
      { name: author.name, url: siteId(`/authors/${author.slug}`) },
    ]),
    ...(faq.length > 0 ? [faqPageSchema(faq)] : []),
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 max-sm:px-4">
      <JsonLd schemas={schemas} />

      <nav
        aria-label="Breadcrumb"
        className="mb-4 text-sm text-text-muted"
      >
        <Link href="/" className="hover:text-text-primary">
          Home
        </Link>{" "}
        / <span>{author.name}</span>
      </nav>

      <header className="mb-10">
        <h1 className="text-4xl font-bold leading-tight max-sm:text-3xl">
          {author.name}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-text-muted">
          {lead}
        </p>
      </header>

      <section id="works" className="mb-12">
        <h2 className="mb-4 text-2xl font-bold">Books by {author.name}</h2>
        <ul className="grid grid-cols-3 gap-5 max-sm:grid-cols-2">
          {works.map((w) => (
            <li key={w.isbn13}>
              <Link href={`/book/${w.isbn13}`} className="group block">
                <div className="aspect-[2/3] overflow-hidden rounded-(--radius-input) bg-bg-medium">
                  {w.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={w.image}
                      alt={w.title ?? "Book cover"}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-text-subtle">
                      No cover
                    </div>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-tight">
                  {w.title ?? "Untitled"}
                </p>
                {w.pub_year && (
                  <p className="text-xs text-text-subtle">{w.pub_year}</p>
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
        <Link href="/" className="text-accent hover:underline">
          in prose — Books and data, perfectly bound.
        </Link>
      </p>
    </div>
  );
}

// ── Data fetching ──

async function fetchAuthor(slug: string): Promise<AuthorRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_author_by_slug", { p_slug: slug })
    .maybeSingle();
  if (error || !data) return null;
  return data as AuthorRow;
}

async function fetchWorks(authorId: string, limit: number): Promise<Work[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_works_for_author", {
    p_author_id: authorId,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data as Work[];
}

// ── Helpers ──

function buildLead(author: AuthorRow): string {
  const parts: string[] = [];

  if (author.book_count > 0) {
    parts.push(
      `${author.name} has ${author.book_count} ${
        author.book_count === 1 ? "book" : "books"
      } tracked on in prose`
    );
  } else {
    parts.push(`${author.name} is tracked on in prose`);
  }

  if (author.earliest_year && author.latest_year) {
    if (author.earliest_year === author.latest_year) {
      parts.push(`published in ${author.earliest_year}`);
    } else {
      parts.push(
        `published between ${author.earliest_year} and ${author.latest_year}`
      );
    }
  }

  if (author.top_genres && author.top_genres.length > 0) {
    parts.push(
      `primarily ${author.top_genres.slice(0, 3).join(", ").toLowerCase()}`
    );
  }

  return parts.join(", ") + ".";
}

function buildAuthorFaq(
  author: AuthorRow,
  works: Work[]
): Array<{ question: string; answer: string }> {
  const qa: Array<{ question: string; answer: string }> = [];

  if (works.length > 0) {
    const sorted = [...works].sort((a, b) => {
      const yA = a.pub_year ?? 9999;
      const yB = b.pub_year ?? 9999;
      return yA - yB;
    });
    const debut = sorted[0];
    if (debut.title) {
      qa.push({
        question: `What was ${author.name}'s first book?`,
        answer: `${author.name}'s earliest book tracked on in prose is ${debut.title}${
          debut.pub_year ? ` (${debut.pub_year})` : ""
        }.`,
      });
    }
  }

  if (works.length > 0) {
    const latest = [...works]
      .filter((w) => w.pub_year !== null)
      .sort((a, b) => (b.pub_year ?? 0) - (a.pub_year ?? 0))[0];
    if (latest && latest.title) {
      qa.push({
        question: `What is ${author.name}'s most recent book?`,
        answer: `${author.name}'s most recently published book on in prose is ${latest.title}${
          latest.pub_year ? ` (${latest.pub_year})` : ""
        }.`,
      });
    }
  }

  if (author.book_count > 0) {
    qa.push({
      question: `How many books has ${author.name} written?`,
      answer: `in prose tracks ${author.book_count} ${
        author.book_count === 1 ? "book" : "books"
      } by ${author.name}.`,
    });
  }

  return qa;
}
