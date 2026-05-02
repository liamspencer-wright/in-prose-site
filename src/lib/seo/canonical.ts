import { createClient } from "@/lib/supabase/server";

type CanonicalRow = {
  isbn13: string;
  group_id: string | null;
  date_published: string | null;
};

/**
 * Pick canonical ISBN for a work that may have multiple editions.
 *
 * Books linked via `book_isbn_groups` are different editions of one work.
 * Canonical is the earliest-published edition; ties broken by lexicographic ISBN.
 * Books not in any group are their own canonical.
 *
 * Returns the requested ISBN if no group lookup is possible (offline / not seeded yet).
 */
export async function getCanonicalIsbn(isbn: string): Promise<string> {
  const supabase = await createClient();

  const { data: mapping, error: mappingErr } = await supabase
    .from("book_isbn_groups")
    .select("group_id")
    .eq("isbn13", isbn)
    .maybeSingle();

  if (mappingErr || !mapping) return isbn;

  const { data: editions, error: editionsErr } = await supabase
    .from("book_isbn_groups")
    .select("isbn13, books!inner(date_published)")
    .eq("group_id", mapping.group_id);

  if (editionsErr || !editions || editions.length === 0) return isbn;

  const rows = editions as unknown as Array<{
    isbn13: string;
    books: { date_published: string | null } | null;
  }>;

  return pickCanonical(rows.map((r) => ({
    isbn13: r.isbn13,
    group_id: mapping.group_id,
    date_published: r.books?.date_published ?? null,
  })));
}

/**
 * Pick canonical ISBN given a set of ISBNs in the same group.
 * Earliest publish date wins; tie-break by min ISBN13.
 */
export function pickCanonical(rows: CanonicalRow[]): string {
  if (rows.length === 0) throw new Error("pickCanonical: empty input");
  const sorted = [...rows].sort((a, b) => {
    const dA = a.date_published ?? "9999";
    const dB = b.date_published ?? "9999";
    if (dA !== dB) return dA.localeCompare(dB);
    return a.isbn13.localeCompare(b.isbn13);
  });
  return sorted[0].isbn13;
}

/**
 * Build canonical lookup for many ISBNs at once (used by sitemap).
 *
 * Returns:
 *  - `canonicalForIsbn`: map of ISBN -> canonical ISBN
 *  - `canonicalSet`: set of all canonical ISBNs (deduped)
 */
export async function buildCanonicalIndex(isbns: string[]): Promise<{
  canonicalForIsbn: Map<string, string>;
  canonicalSet: Set<string>;
}> {
  const supabase = await createClient();

  const { data: mappings } = await supabase
    .from("book_isbn_groups")
    .select("isbn13, group_id, books!inner(date_published)")
    .in("isbn13", isbns);

  const rows =
    (mappings as unknown as Array<{
      isbn13: string;
      group_id: string;
      books: { date_published: string | null } | null;
    }>) ?? [];

  const byGroup = new Map<string, CanonicalRow[]>();
  const isbnGroupId = new Map<string, string>();

  for (const r of rows) {
    isbnGroupId.set(r.isbn13, r.group_id);
    const list = byGroup.get(r.group_id) ?? [];
    list.push({
      isbn13: r.isbn13,
      group_id: r.group_id,
      date_published: r.books?.date_published ?? null,
    });
    byGroup.set(r.group_id, list);
  }

  const groupCanonical = new Map<string, string>();
  for (const [groupId, group] of byGroup) {
    groupCanonical.set(groupId, pickCanonical(group));
  }

  const canonicalForIsbn = new Map<string, string>();
  const canonicalSet = new Set<string>();

  for (const isbn of isbns) {
    const groupId = isbnGroupId.get(isbn);
    const canonical = groupId ? groupCanonical.get(groupId)! : isbn;
    canonicalForIsbn.set(isbn, canonical);
    canonicalSet.add(canonical);
  }

  return { canonicalForIsbn, canonicalSet };
}
