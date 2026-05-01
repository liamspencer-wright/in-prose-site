import Link from "next/link";
import Image from "next/image";
import type { Database } from "@/types/database";

type NewsPost = Database["public"]["Tables"]["news_posts"]["Row"];

const TYPE_LABELS: Record<NewsPost["type"], string> = {
  featured_review: "Featured Review",
  release_notes_app: "App Release Notes",
  release_notes_website: "Website Release Notes",
  article: "Article",
  announcement: "Announcement",
};

export function NewsCard({ post, compact = false }: { post: NewsPost; compact?: boolean }) {
  const label = TYPE_LABELS[post.type];
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Link
      href={`/news/${post.slug}`}
      className="group block overflow-hidden rounded-(--radius-card) border border-border-subtle bg-bg-medium shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
    >
      {!compact && post.cover_image_url && (
        <div className="relative h-48 w-full overflow-hidden bg-border-subtle">
          <Image
            src={post.cover_image_url}
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
