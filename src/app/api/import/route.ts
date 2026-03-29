import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ISBNDB_BASE = "https://api2.isbndb.com";

type ImportBook = {
  isbn13: string;
  status?: string;
  ownership?: string;
  visibility?: string;
  rating?: number | null;
  review?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

type ImportResult = {
  added: number;
  skipped: number;
  duplicates: number;
  errors: string[];
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const books: ImportBook[] = body.books;

  if (!Array.isArray(books) || books.length === 0) {
    return NextResponse.json(
      { error: "books array is required" },
      { status: 400 }
    );
  }

  if (books.length > 500) {
    return NextResponse.json(
      { error: "Maximum 500 books per import" },
      { status: 400 }
    );
  }

  const result: ImportResult = { added: 0, skipped: 0, duplicates: 0, errors: [] };

  for (const book of books) {
    if (!book.isbn13 || typeof book.isbn13 !== "string") {
      result.skipped++;
      continue;
    }

    // Upsert book metadata (ignoreDuplicates so existing books aren't modified)
    const { error: bookError } = await supabase.from("books").upsert(
      { isbn13: book.isbn13 },
      { onConflict: "isbn13", ignoreDuplicates: true }
    );

    if (bookError) {
      result.errors.push(`${book.isbn13}: failed to upsert book`);
      continue;
    }

    // Insert user_books record
    const { error: linkError } = await supabase.from("user_books").insert({
      user_id: user.id,
      isbn13: book.isbn13,
      status: book.status ?? "to_read",
      ownership: book.ownership ?? "not_owned",
      visibility: book.visibility ?? "public",
      rating: book.rating ?? null,
      review: book.review ?? null,
      started_at: book.started_at ?? null,
      finished_at: book.finished_at ?? null,
    });

    if (linkError) {
      if (linkError.code === "23505") {
        result.duplicates++;
      } else {
        result.errors.push(`${book.isbn13}: ${linkError.message}`);
      }
      continue;
    }

    result.added++;
  }

  return NextResponse.json(result);
}

/* ── Metadata lookup endpoint ── */

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isbn = request.nextUrl.searchParams.get("isbn")?.trim();
  if (!isbn) {
    return NextResponse.json({ error: "isbn is required" }, { status: 400 });
  }

  // Check local database first
  const { data: localBook } = await supabase
    .from("books")
    .select("isbn13, title, image, publisher, date_published, pages, synopsis")
    .eq("isbn13", isbn)
    .maybeSingle();

  if (localBook?.title) {
    // Get authors
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

    return NextResponse.json({
      isbn13: localBook.isbn13,
      title: localBook.title,
      authors,
      coverUrl: localBook.image,
      pubYear: localBook.date_published
        ? parseInt(localBook.date_published.slice(0, 4)) || null
        : null,
      publisher: localBook.publisher,
      pages: localBook.pages,
      synopsis: localBook.synopsis,
    });
  }

  // Fallback to ISBNdb
  const apiKey = process.env.ISBNDB_API_KEY;
  if (apiKey) {
    const meta = await fetchISBNdb(isbn, apiKey);
    if (meta) {
      // Upsert into books table for caching
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

      // Link authors
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

      return NextResponse.json(meta);
    }
  }

  // Fallback to Open Library
  const olMeta = await fetchOpenLibrary(isbn);
  if (olMeta) {
    await supabase.from("books").upsert(
      {
        isbn13: olMeta.isbn13,
        title: olMeta.title,
        publisher: olMeta.publisher,
        image: olMeta.coverUrl,
        pages: olMeta.pages,
        date_published: olMeta.pubYear ? String(olMeta.pubYear) : null,
      },
      { onConflict: "isbn13", ignoreDuplicates: true }
    );

    for (let i = 0; i < olMeta.authors.length; i++) {
      const name = olMeta.authors[i]?.trim();
      if (!name) continue;
      await supabase.rpc("upsert_author_and_link", {
        isbn13_in: olMeta.isbn13,
        author_name_in: name,
        sort_name_in: null,
        ord_in: i + 1,
      });
    }

    return NextResponse.json(olMeta);
  }

  return NextResponse.json(null);
}

type BookMeta = {
  isbn13: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  pubYear: number | null;
  publisher: string | null;
  pages: number | null;
  synopsis: string | null;
};

async function fetchISBNdb(
  isbn: string,
  apiKey: string
): Promise<BookMeta | null> {
  try {
    const res = await fetch(`${ISBNDB_BASE}/book/${isbn}`, {
      headers: { Authorization: apiKey, "x-api-key": apiKey },
      signal: AbortSignal.timeout(8000),
    });
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
  } catch {
    return null;
  }
}

async function fetchOpenLibrary(isbn: string): Promise<BookMeta | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/isbn/${isbn}.json`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();

    const title = data.title ?? "Untitled";
    const pages = typeof data.number_of_pages === "number" ? data.number_of_pages : null;
    const pubDate = data.publish_date as string | undefined;
    const pubYear = pubDate ? parseInt(pubDate.slice(-4)) || null : null;
    const publishers = data.publishers as string[] | undefined;
    const coverId = data.covers?.[0];
    const coverUrl = coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      : null;

    // Fetch authors
    const authorKeys: { key: string }[] = data.authors ?? [];
    const authors: string[] = [];
    for (const ak of authorKeys.slice(0, 5)) {
      try {
        const aRes = await fetch(`https://openlibrary.org${ak.key}.json`, {
          signal: AbortSignal.timeout(5000),
        });
        if (aRes.ok) {
          const aData = await aRes.json();
          if (aData.name) authors.push(aData.name);
        }
      } catch {
        // skip
      }
    }

    return {
      isbn13: isbn,
      title,
      authors,
      coverUrl,
      pubYear,
      publisher: publishers?.[0] ?? null,
      pages,
      synopsis: null,
    };
  } catch {
    return null;
  }
}
