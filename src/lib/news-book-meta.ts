import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type BookGroupMeta = {
  group_id: string;
  canonical_title: string;
  canonical_author: string;
  image: string | null;
};

// Fetch canonical title/author + a representative cover for a set of book_group ids.
// Picks the first ISBN with a non-null image from books_expanded; falls back to any ISBN.
export async function fetchBookGroupMeta(
  supabase: SupabaseClient<Database>,
  groupIds: string[],
): Promise<Map<string, BookGroupMeta>> {
  const out = new Map<string, BookGroupMeta>();
  if (groupIds.length === 0) return out;

  const { data: groups } = await supabase
    .from("book_groups")
    .select("id, canonical_title, canonical_author")
    .in("id", groupIds);

  if (!groups) return out;

  for (const g of groups) {
    out.set(g.id, {
      group_id: g.id,
      canonical_title: g.canonical_title,
      canonical_author: g.canonical_author,
      image: null,
    });
  }

  const { data: links } = await supabase
    .from("book_isbn_groups")
    .select("group_id, isbn13")
    .in("group_id", groupIds);

  if (!links || links.length === 0) return out;

  const isbns = links.map((l) => l.isbn13);
  const { data: books } = await supabase
    .from("books_expanded")
    .select("isbn13, image")
    .in("isbn13", isbns);

  if (!books) return out;

  const isbnToImage = new Map<string, string | null>();
  for (const b of books) {
    if (b.isbn13) isbnToImage.set(b.isbn13, b.image);
  }

  for (const link of links) {
    const meta = out.get(link.group_id);
    if (!meta || meta.image) continue;
    const img = isbnToImage.get(link.isbn13);
    if (img) meta.image = img;
  }

  return out;
}

export type BookListEntry = { book_group_id: string; note?: string };

export function parseBookListEntries(value: unknown): BookListEntry[] {
  if (!Array.isArray(value)) return [];
  const out: BookListEntry[] = [];
  for (const item of value) {
    if (item && typeof item === "object" && "book_group_id" in item) {
      const id = (item as { book_group_id?: unknown }).book_group_id;
      const note = (item as { note?: unknown }).note;
      if (typeof id === "string") {
        out.push({ book_group_id: id, note: typeof note === "string" ? note : undefined });
      }
    }
  }
  return out;
}
