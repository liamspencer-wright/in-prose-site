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

const FACET_LABELS: Record<string, string> = {
  genre: "Genres",
  mood: "Moods",
  vibe: "Vibes",
  theme: "Themes",
  pace: "Pace",
  tone: "Tones",
};

type FacetRow = {
  facet: string;
  slug: string;
  value_label: string;
  total: number;
};

export const metadata: Metadata = {
  title: "Browse books by mood, vibe, genre, and theme",
  description:
    "Discover books on in prose by genre, mood, vibe, pace, tone, and theme — community-aggregated reading data across thousands of titles.",
  alternates: { canonical: "/browse" },
  openGraph: {
    title: "Browse books by mood, vibe, genre, and theme",
    description:
      "Discover books by genre, mood, vibe, pace, tone, and theme.",
    url: `${SITE_URL}/browse`,
  },
};

export default async function BrowseIndexPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_browse_index");
  const rows = ((data ?? []) as FacetRow[]).map((r) => ({
    ...r,
    total: Number(r.total),
  }));

  const grouped = groupByFacet(rows);

  const facets = Object.keys(grouped).sort((a, b) => {
    // Genre first, then alphabetical.
    if (a === "genre") return -1;
    if (b === "genre") return 1;
    return a.localeCompare(b);
  });

  const schemas = [
    breadcrumbListSchema([
      { name: "Home", url: SITE_URL },
      { name: "Browse", url: siteId("/browse") },
    ]),
    itemListSchema({
      name: "Browse on in prose",
      items: rows.map((r) => ({
        url: siteId(`/browse/${r.facet}/${r.slug}`),
        name: `${r.value_label} (${r.facet})`,
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
        / <span>Browse</span>
      </nav>

      <header className="mb-10">
        <h1 className="text-4xl font-bold leading-tight max-sm:text-3xl">
          Browse
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-text-muted">
          Discover books by genre, mood, vibe, pace, tone, and theme. Powered
          by community-aggregated reading data across thousands of titles on
          in prose.
        </p>
      </header>

      {facets.length === 0 ? (
        <p className="text-text-muted">
          No browse facets available yet — check back as more readers add and
          rate books.
        </p>
      ) : (
        facets.map((facet) => (
          <section key={facet} id={facet} className="mb-10">
            <h2 className="mb-3 text-2xl font-bold capitalize">
              {FACET_LABELS[facet] ?? facet}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {grouped[facet]
                .sort((a, b) => b.total - a.total || a.value_label.localeCompare(b.value_label))
                .map((r) => (
                  <li key={`${r.facet}-${r.slug}`}>
                    <Link
                      href={`/browse/${r.facet}/${r.slug}`}
                      className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-medium px-3 py-1.5 text-sm hover:bg-accent-blue/5"
                    >
                      <span className="font-semibold capitalize">
                        {r.value_label}
                      </span>
                      <span className="text-text-subtle">{r.total}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}

      <p className="mt-12 text-center text-sm text-text-subtle">
        <Link href="/" className="text-accent hover:underline">
          in prose — Books and data, perfectly bound.
        </Link>
      </p>
    </div>
  );
}

function groupByFacet(rows: FacetRow[]): Record<string, FacetRow[]> {
  const out: Record<string, FacetRow[]> = {};
  for (const r of rows) {
    if (!out[r.facet]) out[r.facet] = [];
    out[r.facet].push(r);
  }
  return out;
}
