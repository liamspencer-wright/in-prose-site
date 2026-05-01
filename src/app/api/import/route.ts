import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lookupIsbn } from "./shared";

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

      // Bulk upsert books table (ensure isbn13 rows exist)
      const validBooks = books.filter(
        (b) => b.isbn13 && typeof b.isbn13 === "string"
      );
      const skippedBooks = books.length - validBooks.length;
      result.skipped += skippedBooks;
      processed += skippedBooks;

      if (validBooks.length > 0) {
        const { error: bulkBookError } = await supabase.from("books").upsert(
          validBooks.map((b) => ({ isbn13: b.isbn13 })),
          { onConflict: "isbn13", ignoreDuplicates: true }
        );

        if (bulkBookError) {
          // Fallback: all new books fail
          for (const b of validBooks) {
            result.errors.push(`${b.isbn13}: failed to upsert book`);
          }
          processed += validBooks.length;
        } else {
          // Bulk insert user_books — process in chunks to get per-book errors
          // Supabase upsert doesn't easily report per-row errors, so we insert
          // individually but only the user_books link (books row already exists)
          for (const book of validBooks) {
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
              source: "csv_import",
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
        }
      }

      if (processed > 0 && validBooks.length === 0) {
        controller.enqueue(encoder.encode(JSON.stringify({ progress: processed, total }) + "\n"));
      }

      // Update existing books (still per-row — each needs a different WHERE)
      const validUpdates = updates.filter(
        (b) => b.isbn13 && typeof b.isbn13 === "string"
      );
      const skippedUpdates = updates.length - validUpdates.length;
      result.skipped += skippedUpdates;
      processed += skippedUpdates;

      for (const book of validUpdates) {
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
            source: "csv_import",
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

  const meta = await lookupIsbn(isbn, supabase);
  return NextResponse.json(meta);
}

