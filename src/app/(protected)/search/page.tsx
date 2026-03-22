"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";

type SearchResult = {
  isbn13: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  pubYear: number | null;
  publisher: string | null;
  pages: number | null;
  synopsis: string | null;
};

export default function SearchPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [libraryIsbns, setLibraryIsbns] = useState<Set<string>>(new Set());
  const [addingIsbn, setAddingIsbn] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Load user's library ISBNs to show "In Library" badge
  useEffect(() => {
    if (!user) return;

    async function loadLibrary() {
      const { data } = await supabase
        .from("user_books_expanded")
        .select("isbn13");
      if (data) {
        setLibraryIsbns(
          new Set(data.map((b: { isbn13: string }) => b.isbn13))
        );
      }
    }

    loadLibrary();
  }, [user, supabase]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      }
      setSearched(true);
      setLoading(false);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const addToLibrary = useCallback(
    async (book: SearchResult) => {
      if (!user) return;
      setAddingIsbn(book.isbn13);

      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isbn13: book.isbn13,
          title: book.title,
          authors: book.authors,
          publisher: book.publisher,
          coverUrl: book.coverUrl,
          pages: book.pages,
          pubYear: book.pubYear,
          synopsis: book.synopsis,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Add to library failed:", data.error);
        setAddingIsbn(null);
        return;
      }

      // Update local state and navigate
      setLibraryIsbns((prev) => new Set([...prev, book.isbn13]));
      router.push(`/library/${book.isbn13}?from=search`);
    },
    [user, router]
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-6 pt-4 pb-12 max-sm:px-4">
      <h1 className="mb-6 text-3xl font-bold">Search books</h1>

      {/* Search input */}
      <input
        type="text"
        placeholder="Search by title, author, or ISBN..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        className="mb-6 w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif text-lg outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
      />

      {/* Results */}
      {loading ? (
        <p className="py-12 text-center text-text-muted">Searching...</p>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          {results.map((book) => {
            const inLibrary = libraryIsbns.has(book.isbn13);
            return (
              <div
                key={book.isbn13}
                className="flex gap-4 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-4"
              >
                {/* Cover */}
                <div className="h-[120px] w-[80px] flex-shrink-0 overflow-hidden rounded-lg bg-bg-light shadow-[0_1px_4px_rgba(0,0,0,0.12)]">
                  {book.coverUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (
                          e.target as HTMLImageElement
                        ).nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div
                    className={`flex h-full w-full items-center justify-center text-xs text-text-subtle ${book.coverUrl ? "hidden" : ""}`}
                  >
                    No cover
                  </div>
                </div>

                {/* Info */}
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <h3 className="line-clamp-2 font-semibold leading-tight">
                      {book.title}
                    </h3>
                    {book.authors.length > 0 && (
                      <p className="mt-0.5 text-sm text-text-muted">
                        {book.authors.join(", ")}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-text-subtle">
                      {book.pubYear && <span>{book.pubYear}</span>}
                      {book.publisher && (
                        <span>&middot; {book.publisher}</span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="mt-2">
                    {inLibrary ? (
                      <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                        In library
                      </span>
                    ) : (
                      <button
                        onClick={() => addToLibrary(book)}
                        disabled={addingIsbn === book.isbn13}
                        className="cursor-pointer rounded-(--radius-input) bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
                      >
                        {addingIsbn === book.isbn13
                          ? "Adding..."
                          : "Add to library"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : searched ? (
        <p className="py-12 text-center text-text-muted">
          No books found. Try a different search term.
        </p>
      ) : (
        <p className="py-12 text-center text-text-muted">
          Search for books by title, author, or ISBN to add them to your
          library.
        </p>
      )}
    </div>
  );
}
