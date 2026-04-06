import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const details = request.nextUrl.searchParams.get("details") === "1";

  if (details) {
    const { data } = await supabase
      .from("user_books_expanded")
      .select(
        "isbn13, title, first_author_name, cover_url, status, ownership, visibility, rating, review, started_at, finished_at"
      );

    // Also fetch user_book_reads for re-read matching during import
    const { data: reads } = await supabase
      .from("user_book_reads")
      .select("id, isbn13, read_number, status, started_at, finished_at, rating, review")
      .eq("user_id", user.id)
      .order("read_number", { ascending: true });

    // Group reads by ISBN
    const readsByIsbn: Record<string, typeof reads> = {};
    for (const read of reads ?? []) {
      if (!readsByIsbn[read.isbn13]) readsByIsbn[read.isbn13] = [];
      readsByIsbn[read.isbn13]!.push(read);
    }

    // Attach reads to each book
    const booksWithReads = (data ?? []).map((book) => ({
      ...book,
      reads: readsByIsbn[book.isbn13] ?? [],
    }));

    return NextResponse.json({ books: booksWithReads });
  }

  const { data } = await supabase
    .from("user_books")
    .select("isbn13")
    .eq("user_id", user.id);

  const isbns = (data ?? []).map((r) => r.isbn13);
  return NextResponse.json({ isbns });
}
