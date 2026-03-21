"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { NavBar } from "@/components/nav-bar";
import { BookCard } from "@/components/book-card";

type StatusFilter = "all" | "to_read" | "reading" | "finished" | "dnf";
type SortBy = "created_at" | "title" | "first_author_sort_name" | "rating" | "finished_at";

type LibraryBook = {
  isbn13: string;
  title: string | null;
  first_author_name: string | null;
  first_author_sort_name: string | null;
  cover_url: string | null;
  status: string | null;
  ownership: string | null;
  visibility: string | null;
  rating: number | null;
  review: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
  pages: number | null;
  pub_year: number | null;
};

const STATUS_LABELS: Record<string, string> = {
  all: "All",
  to_read: "To read",
  reading: "Reading",
  finished: "Finished",
  dnf: "DNF",
};

const SORT_LABELS: Record<SortBy, string> = {
  created_at: "Date added",
  title: "Title",
  first_author_sort_name: "Author",
  rating: "Rating",
  finished_at: "Date finished",
};

export default function LibraryPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;

    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("user_books_expanded")
        .select(
          "isbn13, title, first_author_name, first_author_sort_name, cover_url, status, ownership, visibility, rating, review, started_at, finished_at, created_at, pages, pub_year"
        )
        .order("created_at", { ascending: false });

      setBooks((data as LibraryBook[]) ?? []);
      setLoading(false);
    }

    load();
  }, [user]);

  const filtered = useMemo(() => {
    let result = books;

    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.title?.toLowerCase().includes(q) ||
          b.first_author_name?.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "title":
          return (a.title ?? "").localeCompare(b.title ?? "");
        case "first_author_sort_name":
          return (a.first_author_sort_name ?? "").localeCompare(
            b.first_author_sort_name ?? ""
          );
        case "rating":
          return (b.rating ?? -1) - (a.rating ?? -1);
        case "finished_at":
          return (b.finished_at ?? "").localeCompare(a.finished_at ?? "");
        case "created_at":
        default:
          return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      }
    });

    return result;
  }, [books, statusFilter, sortBy, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: books.length };
    for (const b of books) {
      if (b.status) counts[b.status] = (counts[b.status] ?? 0) + 1;
    }
    return counts;
  }, [books]);

  return (
    <div className="flex min-h-svh flex-col">
      <NavBar />

      <div className="mx-auto w-full max-w-4xl px-6 pt-4 pb-12 max-sm:px-4">
        <h1 className="mb-6 text-3xl font-bold">Your library</h1>

        {/* Search */}
        <input
          type="text"
          placeholder="Search your books..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif text-lg outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
        />

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                statusFilter === s
                  ? "bg-accent text-white"
                  : "bg-bg-medium text-text-muted hover:bg-accent/10"
              }`}
            >
              {STATUS_LABELS[s]}
              {statusCounts[s] !== undefined && (
                <span className="ml-1 opacity-70">({statusCounts[s]})</span>
              )}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="mb-6 flex items-center gap-2 text-sm text-text-muted">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="cursor-pointer rounded border border-border bg-bg-light px-2 py-1 font-serif outline-none"
          >
            {(Object.keys(SORT_LABELS) as SortBy[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Book grid */}
        {loading ? (
          <p className="py-12 text-center text-text-muted">
            Loading your library...
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-text-muted">
            {books.length === 0
              ? "Your library is empty. Add books from the iOS app to see them here."
              : "No books match your filters."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((book) => (
              <BookCard key={book.isbn13} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
