import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { JsonLd } from "@/lib/seo/json-ld";
import {
  itemListSchema,
  breadcrumbListSchema,
  siteId,
  SITE_URL,
} from "@/lib/seo/schema";

export const revalidate = 3600;

type ListEntry = {
  slug: string;
  kind: string;
  total: number;
};

export const metadata: Metadata = {
  title: "Best book lists — top rated, best of year, and curated collections",
  description:
    "Top-rated books by genre, best of every year, and curated reading lists from in prose readers.",
  alternates: { canonical: "/lists" },
  openGraph: {
    title: "Best book lists — top rated, best of year, and curated collections",
    description:
      "Top-rated books by genre, best of every year, and curated reading lists.",
    url: `${SITE_URL}/lists`,
  },
};

export default async function ListsIndexPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_lists_for_sitemap");
  const rows = ((data ?? []) as ListEntry[]).map((r) => ({
    ...r,
    total: Number(r.total),
  }));

  const grouped = groupByKind(rows);

  const schemas = [
    breadcrumbListSchema([
      { name: "Home", url: SITE_URL },
      { name: "Book lists", url: siteId("/lists") },
    ]),
    itemListSchema({
      name: "Book lists on in prose",
      items: rows.map((r) => ({
        url: siteId(`/lists/${r.slug}`),
        name: humaniseSlug(r.slug, r.kind),
      })),
    }),
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 max-sm:px-4">
      <JsonLd schemas={schemas} />

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-text-muted">
        <Link href="/" className="hover:text-text-primary">
          Home
        </Link>{" "}
        / <span>Book lists</span>
      </nav>

      <header className="mb-10">
        <h1 className="text-4xl font-bold leading-tight max-sm:text-3xl">
          Book lists
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-text-muted">
          Top-rated books by genre and the best books of every year, ranked by
          community ratings on in prose.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-text-muted">
          No lists yet — check back as more readers add and rate books.
        </p>
      ) : (
        <>
          {grouped["top-rated-genre"] && grouped["top-rated-genre"].length > 0 && (
            <section className="mb-10">
              <h2 className="mb-3 text-2xl font-bold">Top rated by genre</h2>
              <ul className="flex flex-wrap gap-2">
                {grouped["top-rated-genre"]
                  .sort((a, b) => b.total - a.total)
                  .map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={`/lists/${r.slug}`}
                        className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-medium px-3 py-1.5 text-sm hover:bg-accent-blue/5"
                      >
                        <span className="font-semibold capitalize">
                          {humaniseSlug(r.slug, r.kind)}
                        </span>
                        <span className="text-text-subtle">{r.total}</span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          )}

          {grouped["best-of-year"] && grouped["best-of-year"].length > 0 && (
            <section className="mb-10">
              <h2 className="mb-3 text-2xl font-bold">Best of year</h2>
              <ul className="flex flex-wrap gap-2">
                {grouped["best-of-year"]
                  .sort((a, b) => b.slug.localeCompare(a.slug))
                  .map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={`/lists/${r.slug}`}
                        className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-medium px-3 py-1.5 text-sm hover:bg-accent-blue/5"
                      >
                        <span className="font-semibold">
                          {humaniseSlug(r.slug, r.kind)}
                        </span>
                        <span className="text-text-subtle">{r.total}</span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </>
      )}

      <p className="mt-12 text-center text-sm text-text-subtle">
        <Link href="/" className="text-accent hover:underline">
          in prose — Books and data, perfectly bound.
        </Link>
      </p>
    </div>
  );
}

function groupByKind(rows: ListEntry[]): Record<string, ListEntry[]> {
  const out: Record<string, ListEntry[]> = {};
  for (const r of rows) {
    if (!out[r.kind]) out[r.kind] = [];
    out[r.kind].push(r);
  }
  return out;
}

function humaniseSlug(slug: string, kind: string): string {
  if (kind === "best-of-year") {
    const year = slug.replace(/^best-of-/, "");
    return `Best books of ${year}`;
  }
  if (kind === "top-rated-genre") {
    const genreSlug = slug.replace(/^top-rated-/, "");
    return `Top-rated ${genreSlug.replace(/-/g, " ")}`;
  }
  return slug;
}
