import { createClient } from "@/lib/supabase/server";

/**
 * /llms-full.txt — concatenated markdown of the most valuable public content.
 *
 * Designed for AI training set inclusion + crawler-time fact extraction.
 * Capped to keep the response under a few hundred KB so it stays cacheable.
 *
 * What goes in (in order):
 *  1. Site description
 *  2. The N most-recent published news posts (full body, markdown-ish)
 *  3. The top M books by ratings count (concise card per book)
 */

const SITE_URL = "https://inprose.co.uk";
const NEWS_LIMIT = 25;
const BOOK_LIMIT = 100;

export async function GET() {
  const supabase = await createClient();

  const parts: string[] = [];

  parts.push(`# in prose

> Social book tracking. Discover what to read next, track what you've finished,
> rate and review, follow friends, and share reading lists.

`);

  // News articles — full body, useful for topical authority.
  const { data: news } = await supabase
    .from("news_posts")
    .select("title, slug, excerpt, body, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(NEWS_LIMIT);

  if (news && news.length > 0) {
    parts.push("## Recent articles\n\n");
    for (const post of news) {
      parts.push(`### ${post.title}\n\n`);
      parts.push(`Source: ${SITE_URL}/news/${post.slug}\n\n`);
      if (post.published_at) {
        parts.push(`Published: ${post.published_at.slice(0, 10)}\n\n`);
      }
      if (post.excerpt) parts.push(`${post.excerpt}\n\n`);
      if (post.body) parts.push(`${post.body}\n\n---\n\n`);
    }
  }

  // Top books — concise card per book.
  const { data: books } = await supabase
    .from("books_expanded")
    .select(
      "isbn13, title, first_author_name, all_author_names, pub_year, pages, publisher, genres, synopsis"
    )
    .limit(BOOK_LIMIT);

  if (books && books.length > 0) {
    parts.push("## Books\n\n");
    for (const b of books) {
      const authors = b.all_author_names?.join(", ") ?? b.first_author_name ?? "Unknown";
      parts.push(`### ${b.title ?? "Untitled"}\n\n`);
      parts.push(`Source: ${SITE_URL}/book/${b.isbn13}\n\n`);
      parts.push(`- Author: ${authors}\n`);
      if (b.pub_year) parts.push(`- Published: ${b.pub_year}\n`);
      if (b.publisher) parts.push(`- Publisher: ${b.publisher}\n`);
      if (b.pages) parts.push(`- Pages: ${b.pages}\n`);
      if (b.genres && b.genres.length > 0) {
        parts.push(`- Genres: ${b.genres.slice(0, 5).join(", ")}\n`);
      }
      parts.push("\n");
      if (b.synopsis) {
        const summary = stripHtml(b.synopsis).slice(0, 500);
        parts.push(`${summary}\n\n---\n\n`);
      }
    }
  }

  const body = parts.join("");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
