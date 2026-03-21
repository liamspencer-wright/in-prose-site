import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 60;

type Props = {
  params: Promise<{ username: string; isbn: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, isbn } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .ilike("username", username)
    .maybeSingle();

  if (!profile) return { title: "Not found" };

  const { data: book } = await supabase
    .from("user_books_expanded_all")
    .select("title, first_author_name")
    .eq("user_id", profile.id)
    .eq("isbn13", isbn)
    .eq("visibility", "public")
    .maybeSingle();

  if (!book) return { title: "Not found" };

  return {
    title: `${book.title} — ${profile.display_name ?? profile.username}`,
    description: `${book.title} by ${book.first_author_name ?? "Unknown"} in ${profile.display_name ?? profile.username}'s library on in prose.`,
  };
}

export default async function PublicBookPage({ params }: Props) {
  const { username, isbn } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .ilike("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const { data: book } = await supabase
    .from("user_books_expanded_all")
    .select("isbn13, title, first_author_name, authors, cover_url, status, rating, review, started_at, finished_at, pages, pub_year, publisher, synopsis, genres, avg_rating")
    .eq("user_id", profile.id)
    .eq("isbn13", isbn)
    .eq("visibility", "public")
    .maybeSingle();

  if (!book) notFound();

  const STATUS_LABELS: Record<string, string> = {
    to_read: "To read",
    reading: "Reading",
    finished: "Finished",
    dnf: "DNF",
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 max-sm:px-4">
      <Link
        href={`/u/${profile.username}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-accent hover:underline"
      >
        {profile.avatar_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={profile.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
            {(profile.display_name ?? "?").charAt(0).toUpperCase()}
          </span>
        )}
        {profile.display_name ?? profile.username}&apos;s library
      </Link>

      {/* Book header */}
      <div className="mb-8 flex gap-5 max-sm:flex-col max-sm:items-center">
        <div className="aspect-[2/3] w-[120px] flex-shrink-0 overflow-hidden rounded-xl bg-bg-medium shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
          {book.cover_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={book.cover_url} alt={book.title ?? ""} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-text-subtle">No cover</div>
          )}
        </div>
        <div className="flex flex-col justify-center max-sm:text-center">
          <h1 className="text-xl font-bold leading-tight">{book.title ?? "Untitled"}</h1>
          {book.authors && (book.authors as string[]).length > 0 && (
            <p className="mt-1 text-text-muted">{(book.authors as string[]).join(", ")}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-text-subtle max-sm:justify-center">
            {book.pub_year && <span>{book.pub_year}</span>}
            {book.pages && <span>{book.pages} pages</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 max-sm:justify-center">
            {book.status && (
              <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                {STATUS_LABELS[book.status] ?? book.status}
              </span>
            )}
            {book.rating !== null && book.rating > 0 && (
              <span className="rounded-full bg-bg-medium px-3 py-1 text-xs font-semibold">
                {book.rating}/10
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Review */}
      {book.review && (
        <div className="mb-6 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-5">
          <p className="mb-2 text-sm font-semibold text-text-subtle">
            {profile.display_name ?? profile.username}&apos;s review
          </p>
          <p className="leading-relaxed text-text-muted">{book.review}</p>
        </div>
      )}

      {/* Synopsis */}
      {book.synopsis && (
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-bold">Synopsis</h2>
          <div
            className="leading-relaxed text-text-muted [&_b]:font-semibold [&_i]:italic [&_p]:mb-2"
            dangerouslySetInnerHTML={{
              __html: (book.synopsis as string)
                .replace(/<(?!\/?(?:p|b|i|em|strong|br|ul|ol|li)\b)[^>]*>/gi, "")
                .replace(/on\w+="[^"]*"/gi, ""),
            }}
          />
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-2 text-sm">
        {book.publisher && <MetaRow label="Publisher" value={book.publisher as string} />}
        {book.avg_rating !== null && <MetaRow label="Community avg" value={`${(book.avg_rating as number).toFixed(1)}/10`} />}
        {book.started_at && (
          <MetaRow label="Started" value={new Date(book.started_at as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
        )}
        {book.finished_at && (
          <MetaRow label="Finished" value={new Date(book.finished_at as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
        )}
      </div>

      {/* Genres */}
      {book.genres && (book.genres as string[]).length > 0 && (
        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            {(book.genres as string[]).map((g) => (
              <span key={g} className="rounded-full bg-bg-medium px-3 py-1 text-xs text-text-muted">{g}</span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-12 text-center text-sm text-text-subtle">
        <Link href="/" className="text-accent hover:underline">
          in prose — Books and data, perfectly bound.
        </Link>
      </p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border-subtle py-1.5">
      <span className="text-text-subtle">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
