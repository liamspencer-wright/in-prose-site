import type { MentionRef } from "@/lib/seo/schema";
import { siteId, SITE_URL } from "@/lib/seo/schema";

/**
 * Extracts entity mentions from a news post body + structured fields.
 *
 * Sources:
 *  - For body articles: regex-scan for inprose.co.uk URLs that match our
 *    public route patterns, then map each to a Book / Person / ItemList
 *    schema mention.
 *  - For book_spotlight: the spotlight book itself.
 *  - For book_list: each book in the list (handled at the page level so we
 *    can canonicalise group_id → ISBN; this helper only handles body URLs).
 *
 * Deduplicated by @id.
 */
export function extractBodyMentions(body: string | null | undefined): MentionRef[] {
  if (!body) return [];

  const out = new Map<string, MentionRef>();
  const origin = SITE_URL.replace(/\/+$/, "");

  // Match URLs that look like /book/<isbn>, /authors/<slug>, /series/<slug>,
  // /universes/<slug>, /lists/<slug>. Allows trailing punctuation that's
  // common in markdown.
  const urlRe = new RegExp(
    `${escapeRe(origin)}(/(?:book|authors|series|universes|lists)/[A-Za-z0-9_\\-]+)`,
    "g"
  );

  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(body)) !== null) {
    const path = m[1];
    const ref = pathToMention(path);
    if (ref && !out.has(ref.id)) {
      out.set(ref.id, ref);
    }
  }

  return Array.from(out.values());
}

function pathToMention(path: string): MentionRef | null {
  if (path.startsWith("/book/")) {
    return { type: "Book", id: siteId(path) };
  }
  if (path.startsWith("/authors/")) {
    return { type: "Person", id: siteId(path) };
  }
  if (
    path.startsWith("/series/") ||
    path.startsWith("/universes/") ||
    path.startsWith("/lists/")
  ) {
    return { type: "ItemList", id: siteId(path) };
  }
  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
