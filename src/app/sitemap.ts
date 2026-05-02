import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { buildCanonicalIndex } from "@/lib/seo/canonical";

const BASE_URL = "https://inprose.co.uk";

// Sitemaps must stay below 50,000 URLs (Google + Bing limit).
// If we cross that threshold for any single category, split via Next's
// `generateSitemaps` API and serve a sitemap index. See docs/SEO.md.

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/news`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Books — only emit one URL per work (canonical edition).
  const { data: books } = await supabase
    .from("books_expanded")
    .select("isbn13")
    .order("isbn13");

  const allIsbns = (books ?? []).map((b) => b.isbn13);
  const { canonicalSet } = await buildCanonicalIndex(allIsbns);

  const bookPages: MetadataRoute.Sitemap = Array.from(canonicalSet).map(
    (isbn) => ({
      url: `${BASE_URL}/book/${isbn}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })
  );

  // Public profiles — only users with a username.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("username")
    .not("username", "is", null)
    .order("username");

  const profilePages: MetadataRoute.Sitemap = (profiles ?? []).map(
    (profile) => ({
      url: `${BASE_URL}/u/${profile.username}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })
  );

  // News posts.
  const { data: newsPosts } = await supabase
    .from("news_posts")
    .select("slug, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const newsPages: MetadataRoute.Sitemap = (newsPosts ?? []).map((post) => ({
    url: `${BASE_URL}/news/${post.slug}`,
    lastModified: post.published_at ? new Date(post.published_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Authors — every author with ≥ 1 book.
  const { data: authors } = await supabase.rpc("get_authors_for_sitemap");
  const authorRows = (authors ?? []) as Array<{ id: string; slug: string }>;
  const authorPages: MetadataRoute.Sitemap = authorRows.map((a) => ({
    url: `${BASE_URL}/authors/${a.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Series + universes + browse facets + lists — only entities meeting the
  // ≥5-book (browse) / ≥10-book (lists) thresholds are emitted (RPCs enforce).
  const [
    { data: seriesRows },
    { data: universeRows },
    { data: browseRows },
    { data: listRows },
  ] = await Promise.all([
    supabase.rpc("get_series_for_sitemap"),
    supabase.rpc("get_universes_for_sitemap"),
    supabase.rpc("get_browse_facets_for_sitemap"),
    supabase.rpc("get_lists_for_sitemap"),
  ]);
  const seriesPages: MetadataRoute.Sitemap = ((seriesRows ?? []) as Array<{
    slug: string;
  }>).map((s) => ({
    url: `${BASE_URL}/series/${s.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  const universePages: MetadataRoute.Sitemap = ((universeRows ?? []) as Array<{
    slug: string;
  }>).map((u) => ({
    url: `${BASE_URL}/universes/${u.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const browseIndexPage: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/browse`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    },
  ];
  const browsePages: MetadataRoute.Sitemap = ((browseRows ?? []) as Array<{
    facet: string;
    slug: string;
  }>).map((r) => ({
    url: `${BASE_URL}/browse/${r.facet}/${r.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  const listsIndexPage: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/lists`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    },
  ];
  const listPages: MetadataRoute.Sitemap = ((listRows ?? []) as Array<{
    slug: string;
  }>).map((r) => ({
    url: `${BASE_URL}/lists/${r.slug}`,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...bookPages,
    ...profilePages,
    ...newsPages,
    ...authorPages,
    ...seriesPages,
    ...universePages,
    ...browseIndexPage,
    ...browsePages,
    ...listsIndexPage,
    ...listPages,
  ];
}
