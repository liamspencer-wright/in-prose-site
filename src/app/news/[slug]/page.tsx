import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { NavBar } from "@/components/nav-bar";
import { ImageGallery } from "@/components/news/image-gallery";
import { BookSpotlightPage } from "@/components/news/book-spotlight-page";
import { BookListPage } from "@/components/news/book-list-page";
import {
  fetchBookGroupMeta,
  parseBookListEntries,
} from "@/lib/news-book-meta";
import type { Database } from "@/types/database";

type NewsPost = Database["public"]["Tables"]["news_posts"]["Row"];

const TYPE_LABELS: Record<NewsPost["type"], string> = {
  featured_review: "Featured Review",
  release_notes_app: "App Release Notes",
  release_notes_website: "Website Release Notes",
  article: "Article",
  announcement: "Announcement",
  book_spotlight: "Book Spotlight",
  book_list: "Book List",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("news_posts")
    .select("title, excerpt, cover_image_url, image_urls")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) return { title: "Not found — in prose" };

  const ogImage = post.cover_image_url ?? post.image_urls?.[0] ?? null;

  return {
    title: `${post.title} — in prose`,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("news_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) notFound();

  let bookMeta = null;
  let listEntries = parseBookListEntries(post.book_list_entries);
  let listMeta = new Map();

  if (post.type === "book_spotlight" && post.spotlight_book_group_id) {
    const map = await fetchBookGroupMeta(supabase, [post.spotlight_book_group_id]);
    bookMeta = map.get(post.spotlight_book_group_id) ?? null;
  } else if (post.type === "book_list" && listEntries.length > 0) {
    listMeta = await fetchBookGroupMeta(
      supabase,
      listEntries.map((e) => e.book_group_id),
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      <NavBar />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 max-sm:px-4">
        <Link
          href="/news"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary"
        >
          ← All news
        </Link>

        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-accent">
            {TYPE_LABELS[post.type as keyof typeof TYPE_LABELS] ?? post.type}
          </span>
          {post.published_at && (
            <>
              <span className="text-text-subtle">·</span>
              <time
                dateTime={post.published_at}
                className="text-sm text-text-muted"
              >
                {new Date(post.published_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            </>
          )}
        </div>

        <h1 className="font-serif text-4xl font-bold leading-tight text-text-primary max-sm:text-3xl">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mt-4 text-xl leading-relaxed text-text-muted">
            {post.excerpt}
          </p>
        )}

        {post.cover_image_url && (
          <div className="relative mt-8 h-64 w-full overflow-hidden rounded-(--radius-card) bg-border-subtle sm:h-80">
            <Image
              src={post.cover_image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="mt-8 border-t border-border-subtle pt-8">
          {post.type === "book_spotlight" ? (
            <BookSpotlightPage post={post} book={bookMeta} />
          ) : post.type === "book_list" ? (
            <BookListPage post={post} entries={listEntries} metaByGroup={listMeta} />
          ) : (
            <DefaultPostBody post={post} />
          )}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-sm text-text-muted max-sm:px-4">
        <Link href="/news" className="hover:text-text-primary">
          ← Back to news
        </Link>
      </footer>
    </div>
  );
}

function DefaultPostBody({ post }: { post: NewsPost }) {
  const paragraphs = post.body.split(/\n\n+/).filter(Boolean);

  return (
    <>
      {post.image_urls && post.image_urls.length > 0 && (
        <div className="mb-8">
          <ImageGallery urls={post.image_urls} alt={post.title} />
        </div>
      )}
      <div className="prose-styles space-y-4 text-base leading-relaxed text-text-primary">
        {paragraphs.map((para, i) => (
          <p key={i} className="whitespace-pre-wrap">
            {para}
          </p>
        ))}
      </div>
    </>
  );
}
