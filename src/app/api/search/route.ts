import { NextRequest, NextResponse } from "next/server";

const ISBNDB_BASE = "https://api2.isbndb.com";

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

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.ISBNDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Search is not configured" },
      { status: 500 }
    );
  }

  const results = await searchISBNdb(q, apiKey);
  return NextResponse.json({ results });
}

async function searchISBNdb(
  query: string,
  apiKey: string
): Promise<SearchResult[]> {
  try {
    const url = new URL(`${ISBNDB_BASE}/books/${encodeURIComponent(query)}`);
    url.searchParams.set("page", "1");
    url.searchParams.set("pageSize", "20");
    url.searchParams.set("shouldMatchAll", "0");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: apiKey,
        "x-api-key": apiKey,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const books: unknown[] = data.books ?? data.data ?? [];

    const mapped: (SearchResult | null)[] = books.map((b: unknown) => {
      const book = b as Record<string, unknown>;
      const isbn13 =
        (book.isbn13 as string) ?? (book.isbn as string) ?? null;
      if (!isbn13) return null;

      const title = (book.title as string) ?? "Untitled";
      const authors = (book.authors as string[]) ?? [];
      const image = book.image as string | undefined;
      const coverUrl =
        image && image.length > 0
          ? image
          : `https://images.isbndb.com/covers/${isbn13}.jpg`;
      const datePublished = book.date_published as string | undefined;
      const pubYear = datePublished
        ? parseInt(datePublished.slice(0, 4)) || null
        : null;

      return {
        isbn13,
        title: cleanTitle(title),
        authors,
        coverUrl,
        pubYear,
        publisher: (book.publisher as string) ?? null,
        pages: typeof book.pages === "number" ? book.pages : null,
        synopsis: (book.synopsis as string) ?? null,
      };
    });

    return mapped.filter((r): r is SearchResult => r !== null);
  } catch {
    return [];
  }
}

function cleanTitle(title: string): string {
  return title
    .replace(/:\s*a\s+novel\s*$/i, "")
    .replace(/\s+a\s+novel\s*$/i, "")
    .replace(/\(a\s+novel\)\s*$/i, "")
    .trim();
}
