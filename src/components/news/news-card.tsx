import Link from "next/link";
import Image from "next/image";
import type { Database } from "@/types/database";
import {
  parseBookListEntries,
  type BookGroupMeta,
} from "@/lib/news-book-meta";

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

export function NewsCard({
  post,
  compact = false,
  bookMeta,
}: {
  post: NewsPost;
  compact?: boolean;
  bookMeta?: Map<string, BookGroupMeta>;
}) {
  const label = TYPE_LABELS[post.type];
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const fallbackImage = post.cover_image_url ?? post.image_urls?.[0] ?? null;

  if (post.type === "book_spotlight" && !compact) {
    const meta = post.spotlight_book_group_id
      ? bookMeta?.get(post.spotlight_book_group_id)
      : undefined;
    return (
      <Link
        href={`/news/${post.slug}`}
        className="group block overflow-hidden rounded-(--radius-card) border border-border-subtle bg-bg-medium shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
      >
        <div className="flex gap-4 p-5">
          {meta?.image ? (
            <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-(--radius-input) bg-border-subtle">
              <Image
                src={meta.image}
                alt={meta.canonical_title}
                fill
                className="object-cover"
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">
              {label}
            </span>
            <h2 className="mt-1 font-serif text-lg font-bold leading-snug text-text-primary">
              {post.title}
            </h2>
            {meta && (
              <p className="mt-1 truncate text-xs text-text-muted">
                {meta.canonical_title} · {meta.canonical_author}
              </p>
            )}
            {post.excerpt && (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-muted">
                {post.excerpt}
              </p>
            )}
            {date && <p className="mt-2 text-xs text-text-subtle">{date}</p>}
          </div>
        </div>
      </Link>
    );
  }

  if (post.type === "book_list" && !compact) {
    const entries = parseBookListEntries(post.book_list_entries).slice(0, 4);
    const covers = entries
      .map((e) => bookMeta?.get(e.book_group_id)?.image)
      .filter((x): x is string => Boolean(x));
    return (
      <Link
        href={`/news/${post.slug}`}
        className="group block overflow-hidden rounded-(--radius-card) border border-border-subtle bg-bg-medium shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
      >
        {covers.length > 0 && (
          <div className="flex h-40 gap-1 overflow-hidden bg-border-subtle p-3">
            {covers.map((src, i) => (
              <div
                key={i}
                className="relative h-full flex-1 overflow-hidden rounded-sm bg-bg-medium"
              >
                <Image src={src} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        )}
        <div className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wide text-accent">
            {label}
          </span>
          <h2 className="mt-1 font-serif text-xl font-bold leading-snug text-text-primary">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-muted">
              {post.excerpt}
            </p>
          )}
          {date && <p className="mt-3 text-xs text-text-subtle">{date}</p>}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/news/${post.slug}`}
      className="group block overflow-hidden rounded-(--radius-card) border border-border-subtle bg-bg-medium shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
    >
      {!compact && fallbackImage && (
        <div className="relative h-48 w-full overflow-hidden bg-border-subtle">
          <Image
            src={fallbackImage}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      )}

      <div className={compact ? "p-4" : "p-5"}>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-accent">
            {label}
          </span>
          {post.type === "release_notes_app" || post.type === "release_notes_website" ? (
            <VersionBadge title={post.title} />
          ) : null}
        </div>

        <h2 className={`font-serif font-bold leading-snug ${compact ? "text-base" : "text-xl"} text-text-primary`}>
          {post.title}
        </h2>

        {!compact && post.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-muted">
            {post.excerpt}
          </p>
        )}

        {date && (
          <p className={`text-xs text-text-subtle ${compact ? "mt-2" : "mt-3"}`}>
            {date}
          </p>
        )}
      </div>
    </Link>
  );
}

function VersionBadge({ title }: { title: string }) {
  const match = title.match(/v?\d+\.\d+[\.\d]*/);
  if (!match) return null;
  return (
    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
      {match[0]}
    </span>
  );
}
