import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { NewsCard } from "@/components/news/news-card";
import { NavBar } from "@/components/nav-bar";
import Link from "next/link";

export const metadata: Metadata = {
  title: "News — in prose",
  description: "Updates, release notes, featured reviews, and articles from in prose.",
  openGraph: {
    title: "News — in prose",
    description: "Updates, release notes, featured reviews, and articles from in prose.",
    url: "https://inprose.co.uk/news",
  },
};

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "release_notes_app", label: "App updates" },
  { value: "release_notes_website", label: "Website updates" },
  { value: "featured_review", label: "Reviews" },
  { value: "article", label: "Articles" },
  { value: "announcement", label: "Announcements" },
] as const;

type FilterType = (typeof TYPE_FILTERS)[number]["value"];

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const { type: typeParam, page: pageParam } = await searchParams;
  const selectedType: FilterType =
    TYPE_FILTERS.some((f) => f.value === typeParam)
      ? (typeParam as FilterType)
      : "all";
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const pageSize = 12;

  const supabase = await createClient();

  let query = supabase
    .from("news_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (selectedType !== "all") {
    query = query.eq("type", selectedType);
  }

  const { data: posts } = await query;

  return (
    <div className="flex min-h-svh flex-col">
      <NavBar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 max-sm:px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-serif">News</h1>
          <p className="mt-2 text-text-muted">
            Updates, releases, and articles from the in prose team.
          </p>
        </div>

        {/* Type filter tabs */}
        <div className="mb-8 flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={f.value === "all" ? "/news" : `/news?type=${f.value}`}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                selectedType === f.value
                  ? "border-accent bg-accent text-text-on-accent"
                  : "border-border text-text-muted hover:border-accent/50 hover:text-text-primary"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {!posts?.length ? (
          <p className="text-text-muted">Nothing published yet. Check back soon.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <NewsCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {posts && posts.length === pageSize && (
          <div className="mt-10 flex justify-center">
            <Link
              href={`/news?${selectedType !== "all" ? `type=${selectedType}&` : ""}page=${page + 1}`}
              className="rounded-(--radius-input) border border-accent px-6 py-2.5 text-sm font-semibold text-accent hover:bg-accent/5"
            >
              Load more
            </Link>
          </div>
        )}
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-sm text-text-muted max-sm:px-4">
        <Link href="/" className="hover:text-text-primary">
          ← Back to in prose
        </Link>
      </footer>
    </div>
  );
}
