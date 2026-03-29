"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

type BookMeta = {
  title: string;
  authors: string[];
  publisher: string | null;
  coverUrl: string | null;
  pages: number | null;
  pubYear: number | null;
  synopsis: string | null;
};

export function BookEditWrapper({
  isbn,
  bookMeta,
}: {
  isbn: string;
  bookMeta: BookMeta;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [mounted, setMounted] = useState(false);
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [loadingBook, setLoadingBook] = useState(true);

  // Editable fields
  const [status, setStatus] = useState("to_read");
  const [ownership, setOwnership] = useState("not_owned");
  const [visibility, setVisibility] = useState("public");
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [finishedAt, setFinishedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setMounted(true), []);

  // Load user's book data if logged in
  useEffect(() => {
    if (authLoading || !mounted) return;
    if (!user) {
      setLoadingBook(false);
      return;
    }

    async function loadUserBook() {
      const { data } = await supabase
        .from("user_books_expanded")
        .select(
          "status, ownership, visibility, rating, review, started_at, finished_at"
        )
        .eq("isbn13", isbn)
        .maybeSingle();

      if (data) {
        setIsInLibrary(true);
        setStatus(data.status ?? "to_read");
        setOwnership(data.ownership ?? "not_owned");
        setVisibility(data.visibility ?? "public");
        setRating(data.rating as number | null);
        setReview((data.review as string) ?? "");
        setStartedAt(
          data.started_at ? (data.started_at as string).slice(0, 10) : ""
        );
        setFinishedAt(
          data.finished_at ? (data.finished_at as string).slice(0, 10) : ""
        );
      }
      setLoadingBook(false);
    }

    loadUserBook();
  }, [user, authLoading, mounted, isbn, supabase]);

  const save = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);

    if (isInLibrary) {
      // Update existing record
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
    } else {
      // Add to library with current field values
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isbn13: isbn,
          title: bookMeta.title,
          authors: bookMeta.authors,
          publisher: bookMeta.publisher,
          coverUrl: bookMeta.coverUrl,
          pages: bookMeta.pages,
          pubYear: bookMeta.pubYear,
          synopsis: bookMeta.synopsis,
          status,
          ownership,
          visibility,
          rating,
          review: review.trim() || null,
          started_at: startedAt || null,
          finished_at: finishedAt || null,
        }),
      });

      if (!res.ok) {
        console.error("Add to library failed");
        setSaving(false);
        return;
      }

      setIsInLibrary(true);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [
    user,
    supabase,
    isbn,
    isInLibrary,
    bookMeta,
    status,
    ownership,
    visibility,
    rating,
    review,
    startedAt,
    finishedAt,
  ]);

  const handleDelete = useCallback(async () => {
    if (!user) return;
    setDeleting(true);
    await supabase
      .from("user_books")
      .delete()
      .eq("user_id", user.id)
      .eq("isbn13", isbn);

    setIsInLibrary(false);
    setStatus("to_read");
    setOwnership("not_owned");
    setVisibility("public");
    setRating(null);
    setReview("");
    setStartedAt("");
    setFinishedAt("");
    setConfirmDelete(false);
    setDeleting(false);
    router.refresh();
  }, [user, supabase, isbn, router]);

  // SSR / loading: render nothing to avoid hydration mismatch
  if (!mounted || authLoading) return null;

  // Not logged in: show CTA
  if (!user) {
    return (
      <section className="mt-10 rounded-(--radius-card) border border-border bg-bg-medium p-6 text-center">
        <p className="text-lg font-bold">Track your reading with in prose</p>
        <p className="mt-1 text-sm text-text-muted">
          Add books, rate them, and see what your friends are reading.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-(--radius-input) bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-88"
          >
            Learn more
          </Link>
        </div>
      </section>
    );
  }

  // Logged in but still loading book data
  if (loadingBook) {
    return (
      <p className="mt-8 text-center text-sm text-text-muted">Loading...</p>
    );
  }

  // Logged in: show edit controls
  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-bold">
        {isInLibrary ? "Your book" : "Add to your library"}
      </h2>

      <div className="space-y-6 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-5">
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
                    : "bg-bg-light text-text-muted hover:bg-accent/10"
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
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
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
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
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
                  ★ {rating !== null ? Number(rating).toFixed(1) : "—"}
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
            onClick={save}
            disabled={saving}
            className="cursor-pointer rounded-(--radius-input) bg-accent px-8 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
          >
            {saving
              ? "Saving..."
              : saved
                ? "Saved!"
                : isInLibrary
                  ? "Save changes"
                  : "Add to library"}
          </button>

          {isInLibrary &&
            (confirmDelete ? (
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
            ))}
        </div>
      </div>
    </section>
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
      <label className="mb-1.5 block text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}
