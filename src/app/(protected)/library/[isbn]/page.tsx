"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { NavBar } from "@/components/nav-bar";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
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
  const params = useParams();
  const isbn = params.isbn as string;
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editable fields
  const [status, setStatus] = useState("");
  const [ownership, setOwnership] = useState("");
  const [visibility, setVisibility] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [finishedAt, setFinishedAt] = useState("");

  useEffect(() => {
    if (!user) return;

    async function load() {
      const { data } = await supabase
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
      setStatus(b.status ?? "to_read");
      setOwnership(b.ownership ?? "not_owned");
      setVisibility(b.visibility ?? "public");
      setRating(b.rating);
      setReview(b.review ?? "");
      setStartedAt(b.started_at ? b.started_at.slice(0, 10) : "");
      setFinishedAt(b.finished_at ? b.finished_at.slice(0, 10) : "");
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
    return (
      <div className="flex min-h-svh flex-col">
        <NavBar />
        <p className="py-20 text-center text-text-muted">Loading...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex min-h-svh flex-col">
        <NavBar />
        <div className="py-20 text-center">
          <p className="text-text-muted">Book not found in your library.</p>
          <Link href="/library" className="mt-4 inline-block text-accent hover:underline">
            Back to library
          </Link>
        </div>
      </div>
    );
  }

  const coverSrc = book.image_original || book.cover_url;

  return (
    <div className="flex min-h-svh flex-col">
      <NavBar />

      <div className="mx-auto w-full max-w-2xl px-6 pt-4 pb-12 max-sm:px-4">
        <Link
          href="/library"
          className="mb-6 inline-block text-sm text-accent hover:underline"
        >
          &larr; Back to library
        </Link>

        {/* Book header */}
        <div className="mb-8 flex gap-6 max-sm:flex-col max-sm:items-center">
          <div className="h-[240px] w-[160px] flex-shrink-0 overflow-hidden rounded-xl bg-bg-medium shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
            {coverSrc ? (
              <Image
                src={coverSrc}
                alt={book.title ?? "Book cover"}
                width={160}
                height={240}
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
            {book.all_author_names && book.all_author_names.length > 0 && (
              <p className="mt-1 text-lg text-text-muted">
                {book.all_author_names.join(", ")}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-text-subtle max-sm:justify-center">
              {book.pub_year && <span>{book.pub_year}</span>}
              {book.pages && <span>{book.pages} pages</span>}
              {book.publisher && <span>{book.publisher}</span>}
            </div>
            {book.avg_rating !== null && (
              <p className="mt-2 text-sm text-text-muted">
                Community avg: {book.avg_rating.toFixed(1)}/10
              </p>
            )}
          </div>
        </div>

        {/* Synopsis */}
        {book.synopsis && (
          <div className="mb-8">
            <h2 className="mb-2 text-lg font-bold">Synopsis</h2>
            <p className="leading-relaxed text-text-muted">{book.synopsis}</p>
          </div>
        )}

        {/* Edit form */}
        <div className="space-y-6 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-6">
          <h2 className="text-lg font-bold">Your details</h2>

          {/* Status */}
          <FieldGroup label="Status">
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                    status === opt.value
                      ? "bg-accent text-white"
                      : "bg-bg-light text-text-muted hover:bg-accent/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FieldGroup>

          {/* Rating */}
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
              <span className="w-12 text-center text-lg font-semibold">
                {rating ?? "—"}/10
              </span>
            </div>
          </FieldGroup>

          {/* Review */}
          <FieldGroup label="Review">
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Write your thoughts..."
              rows={4}
              className="w-full resize-none rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
            />
          </FieldGroup>

          {/* Ownership */}
          <FieldGroup label="Ownership">
            <select
              value={ownership}
              onChange={(e) => setOwnership(e.target.value)}
              className="cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif outline-none"
            >
              {OWNERSHIP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FieldGroup>

          {/* Visibility */}
          <FieldGroup label="Visibility">
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif outline-none"
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FieldGroup>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup label="Started">
              <input
                type="date"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                className="w-full cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif outline-none"
              />
            </FieldGroup>
            <FieldGroup label="Finished">
              <input
                type="date"
                value={finishedAt}
                onChange={(e) => setFinishedAt(e.target.value)}
                className="w-full cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif outline-none"
              />
            </FieldGroup>
          </div>

          {/* Save / Delete */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="cursor-pointer rounded-(--radius-input) bg-accent px-8 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
            </button>

            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-error">Are you sure?</span>
                <button
                  onClick={handleDelete}
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

        {/* Genres */}
        {book.genres && book.genres.length > 0 && (
          <div className="mt-6">
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
          </div>
        )}
      </div>
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-text-primary">
        {label}
      </label>
      {children}
    </div>
  );
}
