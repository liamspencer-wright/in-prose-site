import { createClient } from "@/lib/supabase/server";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { BookEditWrapper } from "@/components/book-edit-wrapper";
import UserAvatar from "@/components/user-avatar";
import { getCanonicalIsbn } from "@/lib/seo/canonical";
import { JsonLd } from "@/lib/seo/json-ld";
import {
  bookSchema,
  breadcrumbListSchema,
  faqPageSchema,
  reviewSchema,
  siteId,
  SITE_URL,
} from "@/lib/seo/schema";

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

type PublicReview = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  badge_type: string | null;
  rating: number | null;
  review: string;
  finished_at: string | null;
  created_at: string | null;
};

type AuthorBook = {
  isbn13: string;
  title: string | null;
  image: string | null;
  pub_year: number | null;
};

type ReviewSummary = {
  review_count: number;
  avg_rating: number | null;
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
      types: {
        "text/markdown": `/book/${canonical}/llms.txt`,
      },
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
      // Dynamic OG image served from src/app/book/[isbn]/opengraph-image.tsx
    },
    twitter: {
      card: "summary_large_image",
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

  const [reviews, moreByAuthor, reviewSummary, authorLink, seriesLink] =
    await Promise.all([
      fetchPublicReviews(isbn, 5),
      fetchMoreByAuthor(isbn, 6),
      fetchPublicReviewSummary(isbn),
      fetchAuthorLink(isbn),
      fetchSeriesLink(isbn),
    ]);

  const coverSrc = book.image || book.image_original;

  const schemas = buildBookPageSchemas(book, canonical, reviews, reviewSummary);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 max-sm:px-4">
      <JsonLd schemas={schemas} />

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
              {authorLink ? (
                <Link
                  href={`/authors/${authorLink.slug}`}
                  className="hover:text-accent hover:underline"
                >
                  {book.authors.join(", ")}
                </Link>
              ) : (
                book.authors.join(", ")
              )}
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

      {/* Series banner */}
      {seriesLink && (
        <section id="series" className="mb-6">
          <Link
            href={`/series/${seriesLink.slug}`}
            className="block rounded-(--radius-card) border border-border-subtle bg-bg-medium p-4 hover:bg-accent-blue/5"
          >
            <p className="text-xs uppercase tracking-wider text-accent">
              Part of a series
            </p>
            <p className="mt-1 font-semibold">
              {seriesLink.name}{" "}
              <span className="font-normal text-text-muted">
                · book {Number.isInteger(seriesLink.position) ? seriesLink.position : seriesLink.position.toFixed(1)}
              </span>
            </p>
            <p className="mt-1 text-sm text-text-muted">
              See the full reading order →
            </p>
          </Link>
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

      {/* Public reviews */}
      {reviews.length > 0 && (
        <section id="reviews" className="mb-8">
          <h2 className="mb-3 text-lg font-bold">
            Reviews{" "}
            <span className="text-sm font-normal text-text-muted">
              ({reviewSummary.review_count})
            </span>
          </h2>
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li
                key={r.user_id}
                className="rounded-(--radius-card) border border-border-subtle bg-bg-medium p-4"
              >
                <div className="flex items-start gap-3">
                  <UserAvatar
                    url={r.avatar_url}
                    name={r.display_name}
                    size={36}
                    badgeType={r.badge_type}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {r.display_name ?? r.username ?? "A reader"}
                      {r.username && (
                        <Link
                          href={`/u/${r.username}`}
                          className="ml-1 text-sm font-normal text-text-muted hover:text-accent"
                        >
                          @{r.username}
                        </Link>
                      )}
                      {r.rating !== null && r.rating > 0 && (
                        <span className="ml-2 text-sm text-text-muted">
                          ★ {Number(r.rating).toFixed(1)}
                        </span>
                      )}
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
                      {r.review}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* More by author */}
      {moreByAuthor.length > 0 && (
        <section id="more-by-author" className="mb-8">
          <h2 className="mb-3 text-lg font-bold">
            More by{" "}
            {authorLink ? (
              <Link
                href={`/authors/${authorLink.slug}`}
                className="text-accent hover:underline"
              >
                {authorLink.name}
              </Link>
            ) : (
              book.first_author_name ?? "this author"
            )}
          </h2>
          <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-2">
            {moreByAuthor.map((b) => (
              <Link
                key={b.isbn13}
                href={`/book/${b.isbn13}`}
                className="group block"
              >
                <div className="aspect-[2/3] overflow-hidden rounded-(--radius-input) bg-bg-medium">
                  {b.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={b.image}
                      alt={b.title ?? "Book cover"}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-text-subtle">
                      No cover
                    </div>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-tight">
                  {b.title ?? "Untitled"}
                </p>
                {b.pub_year && (
                  <p className="text-xs text-text-subtle">{b.pub_year}</p>
                )}
              </Link>
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

async function fetchPublicReviews(
  isbn: string,
  limit: number
): Promise<PublicReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_reviews_for_isbn", {
    p_isbn13: isbn,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data as PublicReview[];
}

async function fetchMoreByAuthor(
  isbn: string,
  limit: number
): Promise<AuthorBook[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_more_books_by_author", {
    p_isbn13: isbn,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data as AuthorBook[];
}

async function fetchAuthorLink(
  isbn: string
): Promise<{ name: string; slug: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_author_slug_for_isbn", { p_isbn13: isbn })
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { name: string | null; slug: string | null };
  if (!row.slug || !row.name) return null;
  return { name: row.name, slug: row.slug };
}

async function fetchSeriesLink(
  isbn: string
): Promise<{ name: string; slug: string; position: number } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_series_for_isbn", { p_isbn13: isbn })
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { name: string | null; slug: string | null; position: number | null };
  if (!row.slug || !row.name) return null;
  return {
    name: row.name,
    slug: row.slug,
    position: Number(row.position ?? 0),
  };
}

async function fetchPublicReviewSummary(isbn: string): Promise<ReviewSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_public_review_summary_for_isbn", { p_isbn13: isbn })
    .maybeSingle();
  if (error || !data) return { review_count: 0, avg_rating: null };
  const row = data as { review_count: number | null; avg_rating: number | null };
  return {
    review_count: row.review_count ?? 0,
    avg_rating: row.avg_rating,
  };
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

function buildBookPageSchemas(
  book: BookData,
  canonical: string,
  reviews: PublicReview[],
  reviewSummary: ReviewSummary
): unknown[] {
  const description = book.synopsis ? stripHtml(book.synopsis).slice(0, 500) : null;

  // Prefer the public-review summary (always accurate) over books_expanded
  // columns which may not exist in every environment.
  const ratingForSchema =
    reviewSummary.review_count > 0 && reviewSummary.avg_rating !== null
      ? {
          ratingValue: reviewSummary.avg_rating,
          ratingCount: reviewSummary.review_count,
        }
      : book.community_rating !== null &&
          book.ratings_count !== null &&
          book.ratings_count > 0
        ? {
            ratingValue: book.community_rating,
            ratingCount: book.ratings_count,
          }
        : null;

  const bookId = siteId(`/book/${canonical}`);

  const schemas: unknown[] = [
    bookSchema({
      isbn13: book.isbn13,
      canonicalIsbn: canonical,
      title: book.title ?? "Untitled",
      authors: book.authors,
      image: book.image,
      publisher: book.publisher,
      pubYear: book.pub_year,
      pages: book.pages,
      genres: book.genres,
      description,
      rating: ratingForSchema,
    }),
    breadcrumbListSchema([
      { name: "Home", url: SITE_URL },
      {
        name: book.title ?? "Untitled",
        url: bookId,
      },
    ]),
  ];

  for (const r of reviews) {
    schemas.push(
      reviewSchema({
        itemReviewedId: bookId,
        authorName: r.display_name ?? r.username ?? "A reader",
        authorUrl: r.username ? siteId(`/u/${r.username}`) : undefined,
        ratingValue: r.rating ?? null,
        reviewBody: r.review,
        datePublished: r.finished_at ?? r.created_at ?? undefined,
      })
    );
  }

  const faq = buildBookFaq(book);
  if (faq.length > 0) schemas.push(faqPageSchema(faq));

  return schemas;
}

/**
 * Programmatic FAQ from book metadata. Kept tight: every Q must be answerable
 * from the data we have, and answers must be self-contained so AI can lift
 * them as snippets.
 */
function buildBookFaq(book: BookData): Array<{ question: string; answer: string }> {
  const qa: Array<{ question: string; answer: string }> = [];
  const title = book.title ?? "this book";

  if (book.authors && book.authors.length > 0) {
    qa.push({
      question: `Who wrote ${title}?`,
      answer: `${title} was written by ${book.authors.join(", ")}.`,
    });
  }

  if (book.pages) {
    const minutes = book.pages * 2; // ~2 minutes per page average
    const hours = Math.round(minutes / 60);
    qa.push({
      question: `How long is ${title}?`,
      answer: `${title} is ${book.pages} pages — roughly ${hours} hours of reading at an average pace.`,
    });
  }

  if (book.pub_year) {
    qa.push({
      question: `When was ${title} published?`,
      answer: `${title} was first published in ${book.pub_year}${
        book.publisher ? ` by ${book.publisher}` : ""
      }.`,
    });
  }

  if (book.genres && book.genres.length > 0) {
    qa.push({
      question: `What genre is ${title}?`,
      answer: `${title} is categorised as ${book.genres
        .slice(0, 3)
        .join(", ")}.`,
    });
  }

  return qa;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function sanitiseHtml(html: string): string {
  return html
    .replace(/<(?!\/?(?:p|b|i|em|strong|br|ul|ol|li)\b)[^>]*>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "");
}
