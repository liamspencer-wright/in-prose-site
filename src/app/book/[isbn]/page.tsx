import { createClient } from "@/lib/supabase/server";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { BookEditWrapper } from "@/components/book-edit-wrapper";
import UserAvatar from "@/components/user-avatar";
import { getCanonicalIsbn } from "@/lib/seo/canonical";

export const revalidate = 300; // 5 minutes

type Props = {
  params: Promise<{ isbn: string }>;
  searchParams: Promise<{ shared_by?: string }>;
};

type BookData = {
  isbn13: string;
  title: string | null;
  subtitle: string | null;
  authors: string[] | null;
  first_author_name: string | null;
  publisher: string | null;
  pages: number | null;
  pub_year: number | null;
  synopsis: string | null;
  image: string | null;
  image_original: string | null;
  genres: string[] | null;
  community_rating: number | null;
  ratings_count: number | null;
};

type SharerInfo = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  badge_type: string | null;
  rating: number | null;
  review: string | null;
  status: string | null;
};

// ── Metadata (OG tags for link previews) ──

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { isbn } = await params;
  const book = (await fetchBook(isbn)) ?? (await fetchFromISBNdb(isbn));

  if (!book) return { title: "Book not found", robots: { index: false } };

  const canonical = await getCanonicalIsbn(isbn);

  const authorText = book.authors?.length
    ? ` by ${book.authors.join(", ")}`
    : "";
  const title = `${book.title ?? "Untitled"}${authorText}`;
  const description = book.synopsis
    ? stripHtml(book.synopsis).slice(0, 200)
    : `View ${book.title ?? "this book"} on in prose.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/book/${canonical}`,
    },
    itunes: {
      appId: "6740043848",
      appArgument: `inprose://book/${isbn}`,
    },
    openGraph: {
      title,
      description,
      type: "book",
      url: `https://inprose.co.uk/book/${canonical}`,
      ...(book.image && {
        images: [{ url: book.image, width: 300, height: 450 }],
      }),
    },
    twitter: {
      card: book.image ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

// ── Page ──

export default async function PublicBookPage({ params, searchParams }: Props) {
  const { isbn } = await params;
  const { shared_by } = await searchParams;

  // Edition canonicalisation — redirect non-canonical ISBNs to the canonical one,
  // preserving query strings so share-link context survives the redirect.
  const canonical = await getCanonicalIsbn(isbn);
  if (canonical !== isbn) {
    const qs = shared_by ? `?shared_by=${encodeURIComponent(shared_by)}` : "";
    permanentRedirect(`/book/${canonical}${qs}`);
  }

  let book = await fetchBook(isbn);

  // If not in DB, try fetching from ISBNdb
  if (!book) {
    book = await fetchFromISBNdb(isbn);
  }

  if (!book) notFound();

  // Fetch sharer info if shared_by is provided
  let sharer: SharerInfo | null = null;
  if (shared_by) {
    sharer = await fetchSharerInfo(isbn, shared_by);
  }

  const coverSrc = book.image || book.image_original;

  const jsonLd = buildJsonLd(book);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 max-sm:px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Book header */}
      <div className="mb-8 flex gap-6 max-sm:flex-col max-sm:items-center">
        <div className="h-[240px] w-[160px] flex-shrink-0 overflow-hidden rounded-xl bg-bg-medium shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
          {coverSrc ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={coverSrc}
              alt={book.title ?? "Book cover"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-text-subtle">
              No cover
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center max-sm:text-center">
          <h1 className="text-2xl font-bold leading-tight">
            {book.title ?? "Untitled"}
          </h1>
          {book.subtitle && (
            <p className="mt-1 text-lg text-text-muted">{book.subtitle}</p>
          )}
          {book.authors && book.authors.length > 0 && (
            <p className="mt-2 text-text-muted">
              {book.authors.join(", ")}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-text-subtle max-sm:justify-center">
            {book.pub_year && <span>{book.pub_year}</span>}
            {book.publisher && <span>&middot; {book.publisher}</span>}
            {book.pages && <span>&middot; {book.pages} pages</span>}
          </div>

          {/* Community stats */}
          {(book.community_rating !== null || book.ratings_count !== null) && (
            <div className="mt-4 flex gap-4 max-sm:justify-center">
              {book.community_rating !== null && (
                <div className="rounded-(--radius-input) bg-bg-medium px-3 py-1.5 text-center">
                  <p className="text-lg font-bold text-accent">
                    {book.community_rating.toFixed(1)}
                  </p>
                  <p className="text-xs text-text-subtle">avg rating</p>
                </div>
              )}
              {book.ratings_count !== null && book.ratings_count > 0 && (
                <div className="rounded-(--radius-input) bg-bg-medium px-3 py-1.5 text-center">
                  <p className="text-lg font-bold">
                    {book.ratings_count}
                  </p>
                  <p className="text-xs text-text-subtle">
                    {book.ratings_count === 1 ? "rating" : "ratings"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sharer context */}
      {sharer && (
        <section className="mb-8 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <UserAvatar url={sharer.avatar_url} name={sharer.display_name} size={40} badgeType={sharer.badge_type} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {sharer.display_name ?? "A reader"}
                {sharer.username && (
                  <Link
                    href={`/u/${sharer.username}`}
                    className="ml-1 text-sm font-normal text-text-muted hover:text-accent"
                  >
                    @{sharer.username}
                  </Link>
                )}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-sm text-text-muted">
                {sharer.status && (
                  <span className="capitalize">
                    {sharer.status.replace("_", " ")}
                  </span>
                )}
                {sharer.rating !== null && sharer.rating > 0 && (
                  <span>&middot; ★ {Number(sharer.rating).toFixed(1)}</span>
                )}
              </div>
              {sharer.review && (
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  &ldquo;{sharer.review}&rdquo;
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Synopsis */}
      {book.synopsis && (
        <section className="mb-8">
          <h2 className="mb-2 text-lg font-bold">Synopsis</h2>
          <div
            className="leading-relaxed text-text-muted [&_b]:font-semibold [&_i]:italic [&_p]:mb-2"
            dangerouslySetInnerHTML={{ __html: sanitiseHtml(book.synopsis) }}
          />
        </section>
      )}

      {/* Genres */}
      {book.genres && book.genres.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold text-text-subtle">
            Genres
          </h2>
          <div className="flex flex-wrap gap-2">
            {book.genres.map((g) => (
              <span
                key={g}
                className="rounded-full bg-bg-medium px-3 py-1 text-xs text-text-muted"
              >
                {g}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Edit controls for logged-in users, CTA for guests */}
      <BookEditWrapper
        isbn={book.isbn13}
        bookMeta={{
          title: book.title ?? "Untitled",
          authors: book.authors ?? [],
          publisher: book.publisher,
          coverUrl: book.image,
          pages: book.pages,
          pubYear: book.pub_year,
          synopsis: book.synopsis,
        }}
      />

      {/* Footer */}
      <p className="mt-12 text-center text-sm text-text-subtle">
        <Link href="/" className="text-accent hover:underline">
          in prose — Books and data, perfectly bound.
        </Link>
      </p>
    </div>
  );
}

// ── Data fetching ──

async function fetchBook(isbn: string): Promise<BookData | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books_expanded")
    .select(
      "isbn13, title, subtitle, authors, first_author_name, publisher, pages, pub_year, synopsis, image, image_original, genres, community_rating, ratings_count"
    )
    .eq("isbn13", isbn)
    .maybeSingle();

  return data as BookData | null;
}

async function fetchFromISBNdb(isbn: string): Promise<BookData | null> {
  const apiKey = process.env.ISBNDB_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://api2.isbndb.com/book/${isbn}`, {
      headers: { Authorization: apiKey, "x-api-key": apiKey },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const b = data.book;
    if (!b) return null;

    const image =
      b.image && b.image.length > 0
        ? b.image
        : `https://images.isbndb.com/covers/${isbn}.jpg`;

    const datePublished = b.date_published as string | undefined;
    const pubYear = datePublished
      ? parseInt(datePublished.slice(0, 4)) || null
      : null;

    return {
      isbn13: isbn,
      title: b.title ?? null,
      subtitle: b.subtitle ?? null,
      authors: b.authors ?? null,
      first_author_name: b.authors?.[0] ?? null,
      publisher: b.publisher ?? null,
      pages: typeof b.pages === "number" ? b.pages : null,
      pub_year: pubYear,
      synopsis: b.synopsis ?? null,
      image,
      image_original: null,
      genres: b.subjects ?? null,
      community_rating: null,
      ratings_count: null,
    };
  } catch {
    return null;
  }
}

async function fetchSharerInfo(
  isbn: string,
  userId: string
): Promise<SharerInfo | null> {
  const supabase = await createClient();

  // Get user's book entry (only if public visibility)
  const { data: userBook } = await supabase
    .from("user_books_expanded_all")
    .select("rating, review, status, visibility, user_id")
    .eq("isbn13", isbn)
    .eq("user_id", userId)
    .eq("visibility", "public")
    .maybeSingle();

  if (!userBook) return null;

  // Get sharer's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url, badge_type")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;

  return {
    display_name: profile.display_name,
    username: profile.username,
    avatar_url: profile.avatar_url,
    badge_type: profile.badge_type,
    rating: userBook.rating as number | null,
    review: userBook.review as string | null,
    status: userBook.status as string | null,
  };
}

// ── Helpers ──

function buildJsonLd(book: BookData): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title ?? "Untitled",
    isbn: book.isbn13,
  };

  if (book.authors?.length) {
    ld.author = book.authors.map((name) => ({
      "@type": "Person",
      name,
    }));
  }

  if (book.image) {
    ld.image = book.image;
  }

  if (book.publisher) {
    ld.publisher = {
      "@type": "Organization",
      name: book.publisher,
    };
  }

  if (book.pub_year) {
    ld.datePublished = String(book.pub_year);
  }

  if (book.pages) {
    ld.numberOfPages = book.pages;
  }

  if (book.genres?.length) {
    ld.genre = book.genres;
  }

  if (
    book.community_rating !== null &&
    book.ratings_count !== null &&
    book.ratings_count > 0
  ) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: book.community_rating,
      bestRating: 10,
      worstRating: 0,
      ratingCount: book.ratings_count,
    };
  }

  return ld;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function sanitiseHtml(html: string): string {
  return html
    .replace(/<(?!\/?(?:p|b|i|em|strong|br|ul|ol|li)\b)[^>]*>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "");
}
