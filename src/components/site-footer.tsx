import Link from "next/link";

type FooterLinks = {
  authors: Array<{ name: string; slug: string; count: number }>;
  series: Array<{ name: string; slug: string; count: number }>;
  universes: Array<{ name: string; slug: string; count: number }>;
  genres: Array<{ label: string; slug: string; count: number }>;
  lists: Array<{ slug: string; kind: string; count: number }>;
};

const EMPTY: FooterLinks = {
  authors: [],
  series: [],
  universes: [],
  genres: [],
  lists: [],
};

/**
 * Hits Supabase REST directly with the anon key (no cookies) so we can use
 * Next's built-in fetch cache. unstable_cache won't work because the
 * cookie-aware supabase client touches dynamic data.
 */
async function fetchFooterLinks(): Promise<FooterLinks> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return EMPTY;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_footer_links`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "content-type": "application/json",
      },
      body: "{}",
      next: { revalidate: 3600, tags: ["seo-footer"] },
    });
    if (!res.ok) return EMPTY;
    const data = await res.json();
    return (data as FooterLinks) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

export async function SiteFooter() {
  const links = await fetchFooterLinks();

  // No links yet (fresh DB, RPC missing) → don't render the empty hub.
  const hasAny =
    links.authors.length +
      links.series.length +
      links.universes.length +
      links.genres.length +
      links.lists.length >
    0;
  if (!hasAny) return null;

  return (
    <footer
      aria-label="Site footer"
      className="border-t border-border bg-bg-medium px-6 py-10 max-sm:px-4"
    >
      <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {links.authors.length > 0 && (
          <Section title="Top authors" href="/" hrefLabel="">
            {links.authors.slice(0, 10).map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/authors/${a.slug}`}
                  className="hover:text-text-primary"
                >
                  {a.name}
                </Link>
              </li>
            ))}
          </Section>
        )}

        {links.series.length > 0 && (
          <Section title="Popular series" href="/" hrefLabel="">
            {links.series.slice(0, 10).map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/series/${s.slug}`}
                  className="hover:text-text-primary"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </Section>
        )}

        {links.genres.length > 0 && (
          <Section title="Browse by genre" href="/browse" hrefLabel="All facets">
            {links.genres.slice(0, 10).map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/browse/genre/${g.slug}`}
                  className="hover:text-text-primary"
                >
                  {g.label}
                </Link>
              </li>
            ))}
          </Section>
        )}

        {links.lists.length > 0 && (
          <Section title="Best book lists" href="/lists" hrefLabel="All lists">
            {links.lists.slice(0, 10).map((l) => (
              <li key={l.slug}>
                <Link
                  href={`/lists/${l.slug}`}
                  className="hover:text-text-primary"
                >
                  {humaniseListSlug(l.slug, l.kind)}
                </Link>
              </li>
            ))}
          </Section>
        )}
      </div>

      <div className="mx-auto mt-10 flex max-w-5xl flex-col gap-2 border-t border-border-subtle pt-6 text-sm text-text-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>
          <Link href="/" className="font-semibold hover:text-text-primary">
            in prose
          </Link>
          {" · "}Books and data, perfectly bound.
        </p>
        <nav className="flex gap-4">
          <Link href="/news" className="hover:text-text-primary">
            News
          </Link>
          <Link href="/privacy" className="hover:text-text-primary">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-text-primary">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}

function Section({
  title,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  href: string;
  hrefLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-bold uppercase tracking-wider text-text-primary">
        {title}
      </p>
      <ul className="space-y-1.5 text-sm text-text-muted">{children}</ul>
      {hrefLabel && (
        <p className="mt-3 text-sm">
          <Link href={href} className="text-accent hover:underline">
            {hrefLabel} →
          </Link>
        </p>
      )}
    </div>
  );
}

function humaniseListSlug(slug: string, kind: string): string {
  if (kind === "best-of-year") {
    return `Best of ${slug.replace(/^best-of-/, "")}`;
  }
  if (kind === "top-rated-genre") {
    return `Top-rated ${slug.replace(/^top-rated-/, "").replace(/-/g, " ")}`;
  }
  return slug;
}
