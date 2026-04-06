import { SupabaseClient } from "@supabase/supabase-js";

const ISBNDB_BASE = "https://api2.isbndb.com";

export type BookMeta = {
  isbn13: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  pubYear: number | null;
  publisher: string | null;
  pages: number | null;
  synopsis: string | null;
};

export async function fetchISBNdb(
  isbn: string,
  apiKey: string
): Promise<BookMeta | null> {
  try {
    const res = await fetch(`${ISBNDB_BASE}/book/${isbn}`, {
      headers: { Authorization: apiKey, "x-api-key": apiKey },
      signal: AbortSignal.timeout(4000),
    });
    console.log(`[import/isbndb] ${isbn} → HTTP ${res.status}`);
    if (!res.ok) return null;
    const data = await res.json();
    const book = data.book;
    if (!book) return null;

    const datePublished = book.date_published as string | undefined;
    return {
      isbn13: book.isbn13 ?? isbn,
      title: book.title ?? "Untitled",
      authors: book.authors ?? [],
      coverUrl:
        book.image && book.image.length > 0
          ? book.image
          : `https://images.isbndb.com/covers/${isbn}.jpg`,
      pubYear: datePublished
        ? parseInt(datePublished.slice(0, 4)) || null
        : null,
      publisher: book.publisher ?? null,
      pages: typeof book.pages === "number" ? book.pages : null,
      synopsis: book.synopsis ?? null,
    };
  } catch (err) {
    console.error(`[import/isbndb] ${isbn} error:`, err);
    return null;
  }
}

/**
 * Look up a single ISBN: DB → 404 cache → ISBNdb.
 * Caches the book in DB on success, records 404 on failure.
 */
export async function lookupIsbn(
  isbn: string,
  supabase: SupabaseClient
): Promise<BookMeta | null> {
  // Check local database first
  const { data: localBook } = await supabase
    .from("books")
    .select("isbn13, title, image, publisher, date_published, pages, synopsis")
    .eq("isbn13", isbn)
    .maybeSingle();

  if (localBook?.title) {
    const { data: authorRows } = await supabase
      .from("book_authors")
      .select("authors(name)")
      .eq("isbn13", isbn)
      .order("ord", { ascending: true });

    const authors = (authorRows ?? [])
      .map((r: Record<string, unknown>) => {
        const a = r.authors as { name: string } | null;
        return a?.name;
      })
      .filter(Boolean) as string[];

    return {
      isbn13: localBook.isbn13,
      title: localBook.title,
      authors,
      coverUrl: localBook.image ?? null,
      pubYear: localBook.date_published
        ? parseInt(localBook.date_published.slice(0, 4)) || null
        : null,
      publisher: localBook.publisher ?? null,
      pages: localBook.pages ?? null,
      synopsis: localBook.synopsis ?? null,
    };
  }

  // Check 404 cache
  const { data: cached404 } = await supabase
    .from("book_lookup_failures")
    .select("retry_after")
    .eq("isbn13", isbn)
    .maybeSingle();

  if (cached404 && new Date(cached404.retry_after) > new Date()) {
    return null;
  }

  // ISBNdb lookup
  const apiKey = process.env.ISBNDB_API_KEY;
  if (!apiKey) return null;

  const meta = await fetchISBNdb(isbn, apiKey);
  if (meta) {
    await supabase.from("books").upsert(
      {
        isbn13: meta.isbn13,
        title: meta.title,
        publisher: meta.publisher,
        image: meta.coverUrl,
        pages: meta.pages,
        date_published: meta.pubYear ? String(meta.pubYear) : null,
        synopsis: meta.synopsis,
      },
      { onConflict: "isbn13", ignoreDuplicates: true }
    );

    for (let i = 0; i < meta.authors.length; i++) {
      const name = meta.authors[i]?.trim();
      if (!name) continue;
      await supabase.rpc("upsert_author_and_link", {
        isbn13_in: meta.isbn13,
        author_name_in: name,
        sort_name_in: null,
        ord_in: i + 1,
      });
    }

    await supabase.from("book_lookup_failures").delete().eq("isbn13", isbn);
    return meta;
  }

  // Record 404
  await supabase.from("book_lookup_failures").upsert(
    {
      isbn13: isbn,
      failed_at: new Date().toISOString(),
      retry_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "isbn13" }
  );

  return null;
}
