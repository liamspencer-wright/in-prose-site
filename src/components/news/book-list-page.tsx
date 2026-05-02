import Image from "next/image";
import type { Database } from "@/types/database";
import type { BookGroupMeta, BookListEntry } from "@/lib/news-book-meta";
import { ImageGallery } from "./image-gallery";

type NewsPost = Database["public"]["Tables"]["news_posts"]["Row"];

export function BookListPage({
  post,
  entries,
  metaByGroup,
}: {
  post: NewsPost;
  entries: BookListEntry[];
  metaByGroup: Map<string, BookGroupMeta>;
}) {
  const intro = post.body.split(/\n\n+/).filter(Boolean);

  return (
    <article>
      {post.image_urls && post.image_urls.length > 0 && (
        <div className="mb-8">
          <ImageGallery urls={post.image_urls} alt={post.title} />
        </div>
      )}

      {intro.length > 0 && (
        <div className="prose-styles mb-10 space-y-4 text-base leading-relaxed text-text-primary">
          {intro.map((p, i) => (
            <p key={i} className="whitespace-pre-wrap">
              {p}
            </p>
          ))}
        </div>
      )}

      <ol className="space-y-6">
        {entries.map((entry, idx) => {
          const meta = metaByGroup.get(entry.book_group_id);
          return (
            <li
              key={idx}
              className="flex gap-5 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-5"
            >
              <div className="text-3xl font-serif font-bold text-accent shrink-0 w-10">
                {idx + 1}
              </div>
              {meta?.image && (
                <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-(--radius-input) bg-border-subtle">
                  <Image
                    src={meta.image}
                    alt={meta.canonical_title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-serif text-xl font-bold leading-snug text-text-primary">
                  {meta?.canonical_title ?? "Unknown book"}
                </h3>
                {meta && (
                  <p className="mt-1 text-sm text-text-muted">{meta.canonical_author}</p>
                )}
                {entry.note && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                    {entry.note}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </article>
  );
}
