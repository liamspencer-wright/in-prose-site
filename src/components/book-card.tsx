import Image from "next/image";
import Link from "next/link";

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  to_read: { label: "To read", color: "bg-blue-100 text-blue-800" },
  reading: { label: "Reading", color: "bg-amber-100 text-amber-800" },
  finished: { label: "Finished", color: "bg-green-100 text-green-800" },
  dnf: { label: "DNF", color: "bg-red-100 text-red-800" },
};

type BookCardProps = {
  book: {
    isbn13: string;
    title: string | null;
    first_author_name: string | null;
    cover_url: string | null;
    status: string | null;
    rating: number | null;
  };
};

export function BookCard({ book }: BookCardProps) {
  const badge = book.status ? STATUS_BADGES[book.status] : null;

  return (
    <Link
      href={`/library/${book.isbn13}`}
      className="flex gap-4 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-4 transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
    >
      {/* Cover */}
      <div className="h-[120px] w-[80px] flex-shrink-0 overflow-hidden rounded-lg bg-bg-light">
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title ?? "Book cover"}
            width={80}
            height={120}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-subtle">
            No cover
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <h3 className="line-clamp-2 font-semibold leading-tight">
            {book.title ?? "Untitled"}
          </h3>
          {book.first_author_name && (
            <p className="mt-0.5 text-sm text-text-muted">
              {book.first_author_name}
            </p>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2">
          {badge && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.color}`}
            >
              {badge.label}
            </span>
          )}
          {book.rating !== null && book.rating > 0 && (
            <span className="flex items-center gap-0.5 text-sm text-accent">
              ★ {Number(book.rating).toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
