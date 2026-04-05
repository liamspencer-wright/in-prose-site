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
  updated: number;
  skipped: number;
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
  const books: ImportBook[] = body.books ?? [];
  const updates: ImportBook[] = body.updates ?? [];

  const total = books.length + updates.length;
  if (total === 0) {
    return NextResponse.json(
      { error: "No books to import" },
      { status: 400 }
    );
  }

  if (total > 500) {
    return NextResponse.json(
      { error: "Maximum 500 books per import" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const result: ImportResult = { added: 0, updated: 0, skipped: 0, errors: [] };
      let processed = 0;

      // Insert new books
      for (const book of books) {
        if (!book.isbn13 || typeof book.isbn13 !== "string") {
          result.skipped++;
          processed++;
          controller.enqueue(encoder.encode(JSON.stringify({ progress: processed, total }) + "\n"));
          continue;
        }

        const { error: bookError } = await supabase.from("books").upsert(
          { isbn13: book.isbn13 },
          { onConflict: "isbn13", ignoreDuplicates: true }
        );

        if (bookError) {
          result.errors.push(`${book.isbn13}: failed to upsert book`);
          processed++;
          controller.enqueue(encoder.encode(JSON.stringify({ progress: processed, total }) + "\n"));
          continue;
        }

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
            result.skipped++;
          } else {
            result.errors.push(`${book.isbn13}: ${linkError.message}`);
          }
        } else {
          result.added++;
        }

        processed++;
        controller.enqueue(encoder.encode(JSON.stringify({ progress: processed, total }) + "\n"));
      }

      // Update existing books
      for (const book of updates) {
        if (!book.isbn13 || typeof book.isbn13 !== "string") {
          result.skipped++;
          processed++;
          controller.enqueue(encoder.encode(JSON.stringify({ progress: processed, total }) + "\n"));
          continue;
        }

        const { error: updateError } = await supabase
          .from("user_books")
          .update({
            status: book.status ?? "to_read",
            ownership: book.ownership ?? "not_owned",
            visibility: book.visibility ?? "public",
            rating: book.rating ?? null,
            review: book.review ?? null,
            started_at: book.started_at ?? null,
            finished_at: book.finished_at ?? null,
          })
          .eq("user_id", user.id)
          .eq("isbn13", book.isbn13);

        if (updateError) {
          result.errors.push(`${book.isbn13}: ${updateError.message}`);
        } else {
          result.updated++;
        }

        processed++;
        controller.enqueue(encoder.encode(JSON.stringify({ progress: processed, total }) + "\n"));
      }

      // Final result line
      controller.enqueue(encoder.encode(JSON.stringify({ result }) + "\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
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

  console.log(`[import/meta] Looking up ISBN: ${isbn}`);

  // Check local database first
  const { data: localBook, error: dbError } = await supabase
    .from("books")
    .select("isbn13, title, image, publisher, date_published, pages, synopsis")
    .eq("isbn13", isbn)
    .maybeSingle();

  if (dbError) {
    console.error(`[import/meta] DB error for ${isbn}:`, dbError.message);
  }

  if (localBook?.title) {
    console.log(`[import/meta] Found ${isbn} in local DB: "${localBook.title}"`);
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
  console.log(`[import/meta] ISBNdb key present: ${!!apiKey}, trying ISBNdb for ${isbn}`);
  if (apiKey) {
    const meta = await fetchISBNdb(isbn, apiKey);
    console.log(`[import/meta] ISBNdb result for ${isbn}:`, meta ? `"${meta.title}"` : "null");
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

