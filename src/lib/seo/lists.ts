/**
 * Computed list slug parsing + label rendering.
 *
 * Two patterns supported in MVP:
 *   - top-rated-<genre-slug>   → "Top-rated <genre> books"
 *   - best-of-<year>           → "Best books of <year>"
 *
 * Editorial / hand-curated lists land in a follow-up (need an admin CMS
 * extension).
 */

export type ListKind = "top-rated-genre" | "best-of-year";

export type ListSpec =
  | { kind: "top-rated-genre"; slug: string; genreSlug: string }
  | { kind: "best-of-year"; slug: string; year: number };

const TOP_RATED_RE = /^top-rated-(.+)$/;
const BEST_OF_YEAR_RE = /^best-of-(\d{4})$/;

export function parseListSlug(slug: string): ListSpec | null {
  const yearMatch = BEST_OF_YEAR_RE.exec(slug);
  if (yearMatch?.[1]) {
    const year = Number(yearMatch[1]);
    if (!Number.isFinite(year) || year < 1500 || year > 2100) return null;
    return { kind: "best-of-year", slug, year };
  }

  const topRatedMatch = TOP_RATED_RE.exec(slug);
  if (topRatedMatch?.[1]) {
    return {
      kind: "top-rated-genre",
      slug,
      genreSlug: topRatedMatch[1],
    };
  }

  return null;
}
