import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const isbns: string[] = body.isbns ?? [];

  if (!Array.isArray(isbns) || isbns.length === 0) {
    return NextResponse.json(
      { error: "isbns array is required" },
      { status: 400 }
    );
  }

  if (isbns.length > 500) {
    return NextResponse.json(
      { error: "Maximum 500 ISBNs per request" },
      { status: 400 }
    );
  }

  // Single batch query for all books with a title
  const { data: books, error: booksError } = await supabase
    .from("books")
    .select("isbn13, title, image, publisher, date_published, pages, synopsis")
    .in("isbn13", isbns)
    .not("title", "is", null);

  if (booksError) {
    console.error("[batch-meta] DB error:", booksError.message);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 }
    );
  }

  const foundIsbns = (books ?? []).map((b) => b.isbn13);

  // Single batch query for all authors of found books
  let authorsByIsbn: Record<string, string[]> = {};
  if (foundIsbns.length > 0) {
    const { data: authorRows } = await supabase
      .from("book_authors")
      .select("isbn13, ord, authors(name)")
      .in("isbn13", foundIsbns)
      .order("ord", { ascending: true });

    for (const row of authorRows ?? []) {
      const a = row.authors as unknown as { name: string } | null;
      const name = a?.name;
      if (!name) continue;
      if (!authorsByIsbn[row.isbn13]) authorsByIsbn[row.isbn13] = [];
      authorsByIsbn[row.isbn13].push(name);
    }
  }

  // Assemble found results
  const found: BookMeta[] = (books ?? []).map((b) => ({
    isbn13: b.isbn13,
    title: b.title,
    authors: authorsByIsbn[b.isbn13] ?? [],
    coverUrl: b.image ?? null,
    pubYear: b.date_published
      ? parseInt(b.date_published.slice(0, 4)) || null
      : null,
    publisher: b.publisher ?? null,
    pages: b.pages ?? null,
    synopsis: b.synopsis ?? null,
  }));

  // ISBNs not found in DB (or with no title)
  const foundSet = new Set(foundIsbns);
  const notFound = isbns.filter((isbn) => !foundSet.has(isbn));

  return NextResponse.json({ found, notFound });
}
