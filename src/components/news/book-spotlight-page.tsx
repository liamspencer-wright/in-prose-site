import Image from "next/image";
import type { Database } from "@/types/database";
import type { BookGroupMeta } from "@/lib/news-book-meta";
import { ImageGallery } from "./image-gallery";

type NewsPost = Database["public"]["Tables"]["news_posts"]["Row"];

export function BookSpotlightPage({
  post,
  book,
}: {
  post: NewsPost;
  book: BookGroupMeta | null;
}) {
  const paragraphs = post.body.split(/\n\n+/).filter(Boolean);

  return (
    <article>
      {book && (
        <div className="mb-8 flex gap-5 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-5">
          {book.image && (
            <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-(--radius-input) bg-border-subtle">
              <Image src={book.image} alt={book.canonical_title} fill className="object-cover" />
            </div>
          )}
          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Book spotlight
            </p>
            <h2 className="mt-1 font-serif text-2xl font-bold leading-snug text-text-primary">
              {book.canonical_title}
            </h2>
            <p className="mt-1 text-sm text-text-muted">{book.canonical_author}</p>
          </div>
        </div>
      )}

      {post.image_urls && post.image_urls.length > 0 && (
        <div className="mb-8">
          <ImageGallery urls={post.image_urls} alt={post.title} />
        </div>
      )}

      <div className="prose-styles space-y-4 text-base leading-relaxed text-text-primary">
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-wrap">
            {p}
          </p>
        ))}
      </div>
    </article>
  );
}
