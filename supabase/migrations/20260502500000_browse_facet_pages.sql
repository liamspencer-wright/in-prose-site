-- ============================================================================
-- Browse facet landing pages — public RPCs
-- ============================================================================
-- Supports /browse + /browse/[facet]/[slug] on inprose.co.uk (#179).
--
-- Two facet sources:
--   * "genre" — book-level metadata via book_subjects + subjects (no user
--     visibility considerations — genres are public attributes of the work).
--   * Enrichment facets (mood, vibe, theme, pace, tone, …) — aggregated from
--     enrichment_responses joined to user_books filtered to visibility='public'.
--     SECURITY DEFINER bypass needed because RLS would otherwise hide rows
--     from anon callers.
-- ============================================================================

-- 1. Slug helper for facet values --------------------------------------------
DROP FUNCTION IF EXISTS public.facet_slugify(TEXT);
CREATE OR REPLACE FUNCTION public.facet_slugify(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    nullif(
      regexp_replace(
        regexp_replace(lower(coalesce(p_value, '')), '[^a-z0-9]+', '-', 'g'),
        '^-+|-+$', '', 'g'
      ),
      ''
    );
$$;

GRANT EXECUTE ON FUNCTION public.facet_slugify(TEXT) TO anon, authenticated;

-- 2. Books in a genre --------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_books_by_genre(TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.get_books_by_genre(
  p_slug  TEXT,
  p_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
  isbn13            TEXT,
  title             TEXT,
  image             TEXT,
  pub_year          INTEGER,
  first_author_name TEXT,
  votes             INTEGER,
  genre_label       TEXT,
  total_in_genre    BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH subj AS (
    SELECT s.id, s.name
    FROM subjects s
    WHERE public.facet_slugify(s.name) = p_slug
    ORDER BY s.name
    LIMIT 1
  ),
  works AS (
    SELECT b.isbn13
    FROM book_subjects bs
    JOIN subj s ON s.id = bs.subject_id
    JOIN books b ON b.isbn13 = bs.isbn13
  )
  SELECT
    b.isbn13,
    b.title,
    b.image,
    CASE
      WHEN b.date_published IS NOT NULL AND length(b.date_published) >= 4
      THEN cast(substring(b.date_published, 1, 4) AS INTEGER)
      ELSE NULL
    END AS pub_year,
    (
      SELECT a.name
      FROM book_authors ba
      JOIN authors a ON a.id = ba.author_id
      WHERE ba.isbn13 = b.isbn13
      ORDER BY ba.ord
      LIMIT 1
    ) AS first_author_name,
    0 AS votes,
    (SELECT name FROM subj) AS genre_label,
    (SELECT count(*) FROM works) AS total_in_genre
  FROM books b
  JOIN works w ON w.isbn13 = b.isbn13
  ORDER BY b.date_published DESC NULLS LAST, b.title
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_books_by_genre(TEXT, INTEGER) TO anon, authenticated;

-- 3. Books matching an enrichment facet+value --------------------------------
-- Aggregates votes across public-visibility user_books only. Books need ≥ 2
-- votes for the (facet, value) pair to qualify.
DROP FUNCTION IF EXISTS public.get_books_by_enrichment_facet(TEXT, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.get_books_by_enrichment_facet(
  p_facet_key TEXT,
  p_value     TEXT,
  p_limit     INTEGER DEFAULT 30
)
RETURNS TABLE (
  isbn13            TEXT,
  title             TEXT,
  image             TEXT,
  pub_year          INTEGER,
  first_author_name TEXT,
  votes             INTEGER,
  total_for_value   BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH public_responses AS (
    SELECT er.isbn13, er.answers, er.template_version_id
    FROM enrichment_responses er
    JOIN user_books ub
      ON ub.user_id = er.user_id
     AND ub.isbn13  = er.isbn13
     AND ub.visibility = 'public'
  ),
  matched_single AS (
    SELECT pr.isbn13
    FROM public_responses pr
    JOIN survey_questions sq
      ON sq.template_version_id = pr.template_version_id
     AND sq.key = p_facet_key
    WHERE sq.kind = 'single_select'
      AND pr.answers->>p_facet_key = p_value
  ),
  matched_multi AS (
    SELECT pr.isbn13
    FROM public_responses pr
    JOIN survey_questions sq
      ON sq.template_version_id = pr.template_version_id
     AND sq.key = p_facet_key
    WHERE sq.kind = 'multi_select'
      AND jsonb_typeof(pr.answers->p_facet_key) = 'array'
      AND pr.answers->p_facet_key ? p_value
  ),
  matched AS (
    SELECT isbn13 FROM matched_single
    UNION ALL
    SELECT isbn13 FROM matched_multi
  ),
  counted AS (
    SELECT isbn13, count(*)::integer AS votes
    FROM matched
    GROUP BY isbn13
    HAVING count(*) >= 2
  ),
  total AS (
    SELECT count(*)::bigint AS total FROM counted
  )
  SELECT
    c.isbn13,
    b.title,
    b.image,
    CASE
      WHEN b.date_published IS NOT NULL AND length(b.date_published) >= 4
      THEN cast(substring(b.date_published, 1, 4) AS INTEGER)
      ELSE NULL
    END AS pub_year,
    (
      SELECT a.name
      FROM book_authors ba
      JOIN authors a ON a.id = ba.author_id
      WHERE ba.isbn13 = c.isbn13
      ORDER BY ba.ord
      LIMIT 1
    ) AS first_author_name,
    c.votes,
    (SELECT total FROM total) AS total_for_value
  FROM counted c
  JOIN books b ON b.isbn13 = c.isbn13
  ORDER BY c.votes DESC, b.title
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_books_by_enrichment_facet(TEXT, TEXT, INTEGER) TO anon, authenticated;

-- 4. Sitemap feed: every facet+value with ≥ 5 books --------------------------
DROP FUNCTION IF EXISTS public.get_browse_facets_for_sitemap();
CREATE OR REPLACE FUNCTION public.get_browse_facets_for_sitemap()
RETURNS TABLE (
  facet       TEXT,
  slug        TEXT,
  value_label TEXT,
  total       BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH genres AS (
    SELECT
      'genre'::text AS facet,
      public.facet_slugify(s.name) AS slug,
      s.name AS value_label,
      count(*)::bigint AS total
    FROM book_subjects bs
    JOIN subjects s ON s.id = bs.subject_id
    GROUP BY s.name
    HAVING count(*) >= 5
  ),
  public_responses AS (
    SELECT er.isbn13, er.answers, er.template_version_id
    FROM enrichment_responses er
    JOIN user_books ub
      ON ub.user_id = er.user_id
     AND ub.isbn13  = er.isbn13
     AND ub.visibility = 'public'
  ),
  enrichment_single AS (
    SELECT
      sq.key AS facet,
      public.facet_slugify(pr.answers->>sq.key) AS slug,
      (pr.answers->>sq.key) AS value_label,
      pr.isbn13
    FROM public_responses pr
    JOIN survey_questions sq
      ON sq.template_version_id = pr.template_version_id
    WHERE sq.kind = 'single_select'
      AND pr.answers->>sq.key IS NOT NULL
      AND pr.answers->>sq.key <> ''
  ),
  enrichment_multi AS (
    SELECT
      sq.key AS facet,
      public.facet_slugify(value) AS slug,
      value AS value_label,
      pr.isbn13
    FROM public_responses pr
    JOIN survey_questions sq
      ON sq.template_version_id = pr.template_version_id
    CROSS JOIN LATERAL jsonb_array_elements_text(pr.answers->sq.key) AS value
    WHERE sq.kind = 'multi_select'
      AND jsonb_typeof(pr.answers->sq.key) = 'array'
  ),
  enrichment_all AS (
    SELECT facet, slug, value_label, isbn13 FROM enrichment_single
    UNION ALL
    SELECT facet, slug, value_label, isbn13 FROM enrichment_multi
  ),
  enrichment_counted AS (
    SELECT
      facet,
      slug,
      max(value_label) AS value_label,
      count(DISTINCT isbn13)::bigint AS total
    FROM enrichment_all
    WHERE slug IS NOT NULL
    GROUP BY facet, slug
    HAVING count(DISTINCT isbn13) >= 5
  )
  SELECT facet, slug, value_label, total FROM genres
  UNION ALL
  SELECT facet, slug, value_label, total FROM enrichment_counted
  ORDER BY facet, total DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_browse_facets_for_sitemap() TO anon, authenticated;

-- 5. Browse index — directory of facets + values ----------------------------
-- Used by /browse top-level page. Same data as the sitemap feed but ordered
-- for human display (alphabetical within facet).
DROP FUNCTION IF EXISTS public.get_browse_index();
CREATE OR REPLACE FUNCTION public.get_browse_index()
RETURNS TABLE (
  facet       TEXT,
  slug        TEXT,
  value_label TEXT,
  total       BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT facet, slug, value_label, total
  FROM public.get_browse_facets_for_sitemap()
  ORDER BY facet, value_label;
$$;

GRANT EXECUTE ON FUNCTION public.get_browse_index() TO anon, authenticated;
