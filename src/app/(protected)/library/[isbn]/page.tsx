"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

type BookDetail = {
  isbn13: string;
  title: string | null;
  first_author_name: string | null;
  all_author_names: string[] | null;
  cover_url: string | null;
  image_original: string | null;
  status: string;
  ownership: string;
  visibility: string | null;
  rating: number | null;
  review: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
  pages: number | null;
  pub_year: number | null;
  publisher: string | null;
  synopsis: string | null;
  genres: string[] | null;
  avg_rating: number | null;
};

type Tab = "details" | "edit" | "community";

const TAB_LABELS: Record<Tab, string> = {
  details: "Details",
  edit: "Edit",
  community: "Community",
};

const STATUS_OPTIONS = [
  { value: "to_read", label: "To read" },
  { value: "reading", label: "Reading" },
  { value: "finished", label: "Finished" },
  { value: "dnf", label: "DNF" },
];

const OWNERSHIP_OPTIONS = [
  { value: "owned", label: "Owned" },
  { value: "borrowed", label: "Borrowed" },
  { value: "not_owned", label: "Not owned" },
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "friends_only", label: "Friends only" },
  { value: "private", label: "Private" },
];

export default function BookDetailPage() {
  return (
    <Suspense>
      <BookDetailContent />
    </Suspense>
  );
}

function BookDetailContent() {
  const params = useParams();
  const isbn = params.isbn as string;
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const initialTab = (searchParams.get("tab") as Tab) || "details";
  const initialStatus = searchParams.get("status");
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Editable fields
  const [status, setStatus] = useState("");
  const [ownership, setOwnership] = useState("");
  const [visibility, setVisibility] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [finishedAt, setFinishedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const { data, error } = await supabase
        .from("user_books_expanded")
        .select("*")
        .eq("isbn13", isbn)
        .maybeSingle();

      if (!data) {
        setLoading(false);
        return;
      }

      const b = data as BookDetail;
      setBook(b);
      // If a status was passed via URL (e.g. from dashboard Finish/DNF), pre-select it
      setStatus(initialStatus ?? b.status ?? "to_read");
      setOwnership(b.ownership ?? "not_owned");
      setVisibility(b.visibility ?? "public");
      setRating(b.rating);
      setReview(b.review ?? "");
      setStartedAt(b.started_at ? b.started_at.slice(0, 10) : "");
      if (initialStatus === "finished" || initialStatus === "dnf") {
        setFinishedAt(new Date().toISOString().slice(0, 10));
      } else {
        setFinishedAt(b.finished_at ? b.finished_at.slice(0, 10) : "");
      }
      setLoading(false);
    }

    load();
  }, [user, isbn, supabase]);

  const save = useCallback(async () => {
    if (!user || !book) return;
    setSaving(true);
    setSaved(false);

    await supabase
      .from("user_books")
      .update({
        status,
        ownership,
        visibility,
        rating,
        review: review.trim() || null,
        started_at: startedAt || null,
        finished_at: finishedAt || null,
      })
      .eq("user_id", user.id)
      .eq("isbn13", isbn);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [user, book, supabase, isbn, status, ownership, visibility, rating, review, startedAt, finishedAt]);

  async function handleDelete() {
    if (!user) return;
    setDeleting(true);
    await supabase
      .from("user_books")
      .delete()
      .eq("user_id", user.id)
      .eq("isbn13", isbn);
    router.push("/library");
  }

  if (loading) {
    return <p className="py-20 text-center text-text-muted">Loading...</p>;
  }

  if (!book) {
    return (
      <div className="py-20 text-center">
        <p className="text-text-muted">Book not found in your library.</p>
        <Link href="/library" className="mt-4 inline-block text-accent hover:underline">
          Back to library
        </Link>
      </div>
    );
  }

  const coverSrc = book.cover_url || book.image_original;

  return (
    <div className="mx-auto w-full max-w-2xl px-8 pt-6 pb-12 max-sm:px-5">
      <Link
        href={from === "account" ? "/account" : from === "search" ? "/search" : "/library"}
        className="mb-4 inline-block text-sm text-accent hover:underline"
      >
        &larr; Back to {from === "account" ? "account" : from === "search" ? "search" : "library"}
      </Link>

      {/* Book header — cover + title */}
      <div className="mb-6 flex gap-5 max-sm:flex-col max-sm:items-center">
        <div className="h-[180px] w-[120px] flex-shrink-0 overflow-hidden rounded-xl bg-bg-medium shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
          {coverSrc ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={coverSrc}
              alt={book.title ?? "Book cover"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-text-subtle">
              No cover
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center max-sm:text-center">
          <h1 className="text-xl font-bold leading-tight">
            {book.title ?? "Untitled"}
          </h1>
          {book.all_author_names && book.all_author_names.length > 0 && (
            <p className="mt-1 text-text-muted">
              {book.all_author_names.join(", ")}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-text-subtle max-sm:justify-center">
            {book.pub_year && <span>{book.pub_year}</span>}
            {book.pages && <span>{book.pages} pages</span>}
          </div>
        </div>
      </div>

      {/* Tab selector */}
      <div className="mb-6 flex rounded-full border border-border bg-bg-medium p-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 cursor-pointer rounded-full py-2 text-center text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "bg-accent text-white"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "details" && (
        <DetailsTab book={book} />
      )}

      {activeTab === "edit" && (
        <EditTab
          status={status}
          setStatus={setStatus}
          ownership={ownership}
          setOwnership={setOwnership}
          visibility={visibility}
          setVisibility={setVisibility}
          rating={rating}
          setRating={setRating}
          review={review}
          setReview={setReview}
          startedAt={startedAt}
          setStartedAt={setStartedAt}
          finishedAt={finishedAt}
          setFinishedAt={setFinishedAt}
          saving={saving}
          saved={saved}
          onSave={save}
          confirmDelete={confirmDelete}
          setConfirmDelete={setConfirmDelete}
          deleting={deleting}
          onDelete={handleDelete}
        />
      )}

      {activeTab === "community" && (
        <CommunityTab book={book} />
      )}
    </div>
  );
}

/* ── Details Tab ── */

function DetailsTab({ book }: { book: BookDetail }) {
  return (
    <div className="space-y-6">
      {/* Synopsis */}
      {book.synopsis && (
        <div>
          <h2 className="mb-2 text-lg font-bold">Synopsis</h2>
          <div
            className="leading-relaxed text-text-muted [&_b]:font-semibold [&_i]:italic [&_p]:mb-2"
            dangerouslySetInnerHTML={{ __html: sanitiseHtml(book.synopsis) }}
          />
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-2 text-sm">
        {book.publisher && (
          <MetaRow label="Publisher" value={book.publisher} />
        )}
        {book.pub_year && (
          <MetaRow label="Published" value={String(book.pub_year)} />
        )}
        {book.pages && (
          <MetaRow label="Pages" value={String(book.pages)} />
        )}
        {book.avg_rating !== null && (
          <MetaRow label="Community avg" value={`★ ${book.avg_rating.toFixed(1)}`} />
        )}
      </div>

      {/* Genres */}
      {book.genres && book.genres.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-text-subtle">Genres</h2>
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
        </div>
      )}
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

/** Strip everything except safe inline tags */
function sanitiseHtml(html: string): string {
  return html
    .replace(/<(?!\/?(?:p|b|i|em|strong|br|ul|ol|li)\b)[^>]*>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "");
}

/* ── Edit Tab ── */

function EditTab({
  status, setStatus,
  ownership, setOwnership,
  visibility, setVisibility,
  rating, setRating,
  review, setReview,
  startedAt, setStartedAt,
  finishedAt, setFinishedAt,
  saving, saved, onSave,
  confirmDelete, setConfirmDelete,
  deleting, onDelete,
}: {
  status: string; setStatus: (v: string) => void;
  ownership: string; setOwnership: (v: string) => void;
  visibility: string; setVisibility: (v: string) => void;
  rating: number | null; setRating: (v: number | null) => void;
  review: string; setReview: (v: string) => void;
  startedAt: string; setStartedAt: (v: string) => void;
  finishedAt: string; setFinishedAt: (v: string) => void;
  saving: boolean; saved: boolean; onSave: () => void;
  confirmDelete: boolean; setConfirmDelete: (v: boolean) => void;
  deleting: boolean; onDelete: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Status */}
      <FieldGroup label="Status">
        <div className="grid grid-cols-4 gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={`cursor-pointer rounded-full py-1.5 text-center text-sm font-semibold transition-colors ${
                status === opt.value
                  ? "bg-accent text-white"
                  : "bg-bg-medium text-text-muted hover:bg-accent/10"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* Ownership & Visibility */}
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Ownership">
          <select
            value={ownership}
            onChange={(e) => setOwnership(e.target.value)}
            className="w-full cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif outline-none"
          >
            {OWNERSHIP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup label="Visibility">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-full cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif outline-none"
          >
            {VISIBILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FieldGroup>
      </div>

      {/* Dates — reading: start only; finished/dnf: both */}
      {status !== "to_read" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup label="Started">
            <input
              type="date"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              className="w-full cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif outline-none"
            />
          </FieldGroup>
          {(status === "finished" || status === "dnf") && (
            <FieldGroup label="Finished">
              <input
                type="date"
                value={finishedAt}
                onChange={(e) => setFinishedAt(e.target.value)}
                className="w-full cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif outline-none"
              />
            </FieldGroup>
          )}
        </div>
      )}

      {/* Rating & Review — finished only */}
      {status === "finished" && (
        <>
          <FieldGroup label="Rating">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={rating ?? 0}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setRating(v === 0 ? null : v);
                }}
                className="flex-1 accent-accent"
              />
              <span className="flex w-16 items-center justify-center gap-1 text-lg font-semibold text-accent">
                <span>★</span> {rating !== null ? rating.toFixed(1) : "—"}
              </span>
            </div>
          </FieldGroup>

          <FieldGroup label="Review">
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Write your thoughts..."
              rows={4}
              className="w-full resize-none rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
            />
          </FieldGroup>
        </>
      )}

      {/* Save / Delete */}
      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="cursor-pointer rounded-(--radius-input) bg-accent px-8 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-error">Are you sure?</span>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="cursor-pointer rounded px-3 py-1 text-sm font-semibold text-error transition-colors hover:bg-error/10"
            >
              {deleting ? "Removing..." : "Yes, remove"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="cursor-pointer rounded px-3 py-1 text-sm text-text-muted transition-colors hover:bg-bg-light"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="cursor-pointer text-sm text-text-subtle transition-colors hover:text-error"
          >
            Remove from library
          </button>
        )}
      </div>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}

/* ── Community Tab ── */

type FriendWithBook = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  rating: number | null;
  review: string | null;
  review_spoiler: boolean;
  status: string;
  created_at: string;
};

type PublicReview = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  rating: number | null;
  review: string | null;
  review_spoiler: boolean;
  created_at: string;
};

type BookStats = {
  avg_rating: number | null;
  num_reviews: number | null;
};

const PUBLIC_PAGE_SIZE = 10;

function CommunityTab({ book }: { book: BookDetail }) {
  const { user } = useAuth();

  const [stats, setStats] = useState<BookStats | null>(null);
  const [friendsWithBook, setFriendsWithBook] = useState<FriendWithBook[]>([]);
  const [publicReviews, setPublicReviews] = useState<PublicReview[]>([]);
  const [loadingPublicMore, setLoadingPublicMore] = useState(false);
  const [hasMorePublic, setHasMorePublic] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const supabase = createClient();

      const statsRes = await supabase
        .from("book_stats_expanded")
        .select("avg_rating, num_reviews")
        .eq("isbn13", book.isbn13)
        .maybeSingle();

      const friendsRes = await supabase.rpc("get_friends_with_book", {
        p_isbn13: book.isbn13,
      });

      setStats((statsRes.data as BookStats) ?? null);
      setFriendsWithBook((friendsRes.data as FriendWithBook[]) ?? []);

      const publicRes = await supabase.rpc("get_public_reviews_for_book", {
        p_isbn13: book.isbn13,
        p_limit: PUBLIC_PAGE_SIZE,
        p_offset: 0,
      });

      if (publicRes.data) {
        const pubResults = publicRes.data as PublicReview[];
        setPublicReviews(pubResults);
        setHasMorePublic(pubResults.length === PUBLIC_PAGE_SIZE);
      }

      setLoading(false);
    }

    load();
  }, [user, book.isbn13]);

  async function loadMorePublic() {
    setLoadingPublicMore(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("get_public_reviews_for_book", {
      p_isbn13: book.isbn13,
      p_limit: PUBLIC_PAGE_SIZE,
      p_offset: publicReviews.length,
    });
    const results = (data as PublicReview[]) ?? [];
    setPublicReviews((prev) => [...prev, ...results]);
    setHasMorePublic(results.length === PUBLIC_PAGE_SIZE);
    setLoadingPublicMore(false);
  }

  if (loading) {
    return <p className="py-12 text-center text-text-muted">Loading...</p>;
  }

  const friendsWhoRead = friendsWithBook.filter(
    (f) => f.status === "finished" || f.rating !== null || (f.review && f.review.trim() !== "")
  );
  const friendReviews = friendsWithBook.filter(
    (f) => f.rating !== null || (f.review && f.review.trim() !== "")
  );

  const noContent =
    !stats?.avg_rating && friendsWithBook.length === 0 && publicReviews.length === 0;

  if (noContent) {
    return (
      <p className="py-12 text-center text-text-muted">
        No reviews yet — be the first!
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {/* Community rating badge + friends stats */}
      <div className="text-center">
        {stats?.avg_rating !== null && stats?.avg_rating !== undefined && (
          <div className="mb-4 inline-block rounded-(--radius-card) bg-bg-medium px-8 py-5">
            <p className="flex items-center justify-center gap-1.5 text-3xl font-bold text-accent">
              <span>★</span> {stats.avg_rating.toFixed(1)}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {stats.num_reviews
                ? `${stats.num_reviews} review${stats.num_reviews !== 1 ? "s" : ""}`
                : ""}
            </p>
          </div>
        )}

        {friendsWhoRead.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold">
              {friendsWhoRead.length} friend
              {friendsWhoRead.length !== 1 ? "s" : ""} ha
              {friendsWhoRead.length !== 1 ? "ve" : "s"} read this book
            </p>
            <div className="flex justify-center -space-x-3">
              {friendsWhoRead.slice(0, 5).map((f) => (
                <Avatar
                  key={f.user_id}
                  url={f.avatar_url}
                  name={f.display_name}
                  size={44}
                />
              ))}
              {friendsWhoRead.length > 5 && (
                <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-bg-light bg-bg-medium text-xs font-semibold text-text-muted">
                  +{friendsWhoRead.length - 5}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Friends' Reviews */}
      {friendReviews.length > 0 ? (
        <div>
          <h2 className="mb-3 text-lg font-bold">Friends&apos; Reviews</h2>
          <div className="space-y-3">
            {friendReviews.map((f) => (
              <ReviewCard
                key={f.user_id}
                userId={f.user_id}
                displayName={f.display_name}
                avatarUrl={f.avatar_url}
                rating={f.rating}
                review={f.review}
                reviewSpoiler={f.review_spoiler}
                createdAt={f.created_at}
              />
            ))}
          </div>
        </div>
      ) : friendsWithBook.length > 0 ? (
        <p className="text-center text-sm text-text-subtle">
          No friends have reviewed this book yet.
        </p>
      ) : null}

      {/* Public Reviews */}
      {publicReviews.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold">All Reviews</h2>
          <div className="space-y-3">
            {publicReviews.map((r) => (
              <ReviewCard
                key={r.user_id}
                userId={r.user_id}
                displayName={r.display_name}
                avatarUrl={r.avatar_url}
                rating={r.rating}
                review={r.review}
                reviewSpoiler={r.review_spoiler}
                createdAt={r.created_at}
              />
            ))}
          </div>
          {hasMorePublic && (
            <button
              onClick={loadMorePublic}
              disabled={loadingPublicMore}
              className="mt-4 w-full cursor-pointer rounded-(--radius-input) border border-border py-3 text-sm font-semibold text-text-muted transition-colors hover:bg-bg-medium disabled:opacity-55"
            >
              {loadingPublicMore ? "Loading..." : "Load more reviews"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Shared Components ── */

function Avatar({
  url,
  name,
  size = 32,
}: {
  url: string | null;
  name: string;
  size?: number;
}) {
  const sizeClass =
    size <= 32 ? "h-8 w-8" : size <= 40 ? "h-10 w-10" : "h-11 w-11";
  const textClass = size <= 32 ? "text-xs" : "text-sm";

  return url ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt={name}
      className={`${sizeClass} rounded-full object-cover`}
    />
  ) : (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full bg-accent/15 ${textClass} font-bold text-accent`}
    >
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function ReviewCard({
  userId,
  displayName,
  avatarUrl,
  rating,
  review,
  reviewSpoiler,
  createdAt,
}: {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  rating: number | null;
  review: string | null;
  reviewSpoiler: boolean;
  createdAt: string;
}) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const hasSpoiler = reviewSpoiler && review && !spoilerRevealed;

  return (
    <div className="rounded-(--radius-card) bg-accent-blue p-4">
      <div className="mb-2 flex items-center gap-2">
        <Link href={`/friends/${userId}`}>
          <Avatar url={avatarUrl} name={displayName} size={40} />
        </Link>
        <div className="flex-1">
          <Link
            href={`/friends/${userId}`}
            className="font-semibold text-text-on-accent hover:underline"
          >
            {displayName}
          </Link>
          <p className="text-xs text-text-on-accent/60">Finished</p>
        </div>
        {rating !== null && (
          <span className="flex items-center gap-1 text-lg font-bold text-accent">
            <span>★</span> {rating.toFixed(1)}
          </span>
        )}
      </div>
      {review && (
        <div className="relative">
          <p
            className={`text-sm leading-relaxed text-text-on-accent/85 ${
              hasSpoiler ? "select-none blur-sm" : ""
            }`}
          >
            {review}
          </p>
          {hasSpoiler && (
            <button
              onClick={() => setSpoilerRevealed(true)}
              className="absolute inset-0 flex cursor-pointer items-center justify-center rounded bg-accent-blue/80 text-sm font-semibold text-text-on-accent transition-colors hover:bg-accent-blue/90"
            >
              Contains spoilers — click to reveal
            </button>
          )}
        </div>
      )}
      <p className="mt-2 text-xs text-text-on-accent/50">{formatDate(createdAt)}</p>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
