-- ============================================================================
-- Series + universe landing pages — public RPCs
-- ============================================================================
-- Supports /series/[slug] + /universes/[slug] on inprose.co.uk (#178).
-- The underlying tables already enforce RLS for authenticated reads; these
-- SECURITY DEFINER functions expose a public-safe slice to anon callers.
-- ============================================================================

-- 1. Canonical ISBN per book_group --------------------------------------------
-- Picks the earliest-published edition; ties broken by min isbn13.
DROP FUNCTION IF EXISTS public.canonical_isbn_for_group(UUID);
CREATE OR REPLACE FUNCTION public.canonical_isbn_for_group(p_group_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.isbn13
  FROM book_isbn_groups big
  JOIN books b ON b.isbn13 = big.isbn13
  WHERE big.group_id = p_group_id
  ORDER BY b.date_published ASC NULLS LAST, b.isbn13
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.canonical_isbn_for_group(UUID) TO anon, authenticated;

-- 2. Series + ordered members --------------------------------------------------
DROP FUNCTION IF EXISTS public.get_series_by_slug(TEXT);
CREATE OR REPLACE FUNCTION public.get_series_by_slug(p_slug TEXT)
RETURNS TABLE (
  id            UUID,
  name          TEXT,
  slug          TEXT,
  description   TEXT,
  book_count    BIGINT,
  earliest_year INTEGER,
  latest_year   INTEGER,
  primary_author_name TEXT,
  primary_author_slug TEXT,
  universe_id   UUID,
  universe_name TEXT,
  universe_slug TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH s AS (
    SELECT * FROM series WHERE slug = p_slug LIMIT 1
  ),
  members AS (
    SELECT
      si.position,
      si.book_group_id,
      public.canonical_isbn_for_group(si.book_group_id) AS isbn13
    FROM series_items si
    JOIN s ON s.id = si.series_id
  ),
  member_meta AS (
    SELECT
      m.position,
      m.isbn13,
      CASE
        WHEN b.date_published IS NOT NULL AND length(b.date_published) >= 4
        THEN cast(substring(b.date_published, 1, 4) AS INTEGER)
        ELSE NULL
      END AS pub_year
    FROM members m
    LEFT JOIN books b ON b.isbn13 = m.isbn13
  ),
  primary_author AS (
    SELECT a.id, a.name
    FROM members m
    JOIN book_authors ba ON ba.isbn13 = m.isbn13
    JOIN authors a ON a.id = ba.author_id
    GROUP BY a.id, a.name
    ORDER BY count(*) DESC, min(ba.ord)
    LIMIT 1
  ),
  uni AS (
    SELECT u.id, u.name, u.slug
    FROM universe_series us
    JOIN universes u ON u.id = us.universe_id
    JOIN s ON s.id = us.series_id
    LIMIT 1
  )
  SELECT
    s.id,
    s.name,
    s.slug,
    s.description,
    (SELECT count(*) FROM members) AS book_count,
    (SELECT min(pub_year) FROM member_meta) AS earliest_year,
    (SELECT max(pub_year) FROM member_meta) AS latest_year,
    (SELECT name FROM primary_author),
    (SELECT public.author_slug(id, name) FROM primary_author),
    (SELECT id FROM uni),
    (SELECT name FROM uni),
    (SELECT slug FROM uni)
  FROM s;
$$;

GRANT EXECUTE ON FUNCTION public.get_series_by_slug(TEXT) TO anon, authenticated;

-- 3. Ordered series members (for the reading-order list) ----------------------
DROP FUNCTION IF EXISTS public.get_series_members(UUID);
CREATE OR REPLACE FUNCTION public.get_series_members(p_series_id UUID)
RETURNS TABLE (
  position    NUMERIC,
  isbn13      TEXT,
  title       TEXT,
  image       TEXT,
  pub_year    INTEGER,
  is_optional BOOLEAN,
  notes       TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    si.position,
    public.canonical_isbn_for_group(si.book_group_id) AS isbn13,
    b.title,
    b.image,
    CASE
      WHEN b.date_published IS NOT NULL AND length(b.date_published) >= 4
      THEN cast(substring(b.date_published, 1, 4) AS INTEGER)
      ELSE NULL
    END AS pub_year,
    si.is_optional,
    si.notes
  FROM series_items si
  LEFT JOIN books b ON b.isbn13 = public.canonical_isbn_for_group(si.book_group_id)
  WHERE si.series_id = p_series_id
  ORDER BY si.position;
$$;

GRANT EXECUTE ON FUNCTION public.get_series_members(UUID) TO anon, authenticated;

-- 4. Universe + members --------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_universe_by_slug(TEXT);
CREATE OR REPLACE FUNCTION public.get_universe_by_slug(p_slug TEXT)
RETURNS TABLE (
  id           UUID,
  name         TEXT,
  slug         TEXT,
  description  TEXT,
  series_count BIGINT,
  standalone_book_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH u AS (
    SELECT * FROM universes WHERE slug = p_slug LIMIT 1
  )
  SELECT
    u.id,
    u.name,
    u.slug,
    u.description,
    (SELECT count(*) FROM universe_series us WHERE us.universe_id = u.id) AS series_count,
    (SELECT count(*) FROM universe_books ub WHERE ub.universe_id = u.id) AS standalone_book_count
  FROM u;
$$;

GRANT EXECUTE ON FUNCTION public.get_universe_by_slug(TEXT) TO anon, authenticated;

-- 5. Series in a universe ------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_universe_series(UUID);
CREATE OR REPLACE FUNCTION public.get_universe_series(p_universe_id UUID)
RETURNS TABLE (
  position   NUMERIC,
  series_id  UUID,
  name       TEXT,
  slug       TEXT,
  book_count BIGINT,
  cover_isbn13 TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    us.position,
    s.id,
    s.name,
    s.slug,
    (SELECT count(*) FROM series_items si WHERE si.series_id = s.id) AS book_count,
    (
      SELECT public.canonical_isbn_for_group(si.book_group_id)
      FROM series_items si
      WHERE si.series_id = s.id
      ORDER BY si.position
      LIMIT 1
    ) AS cover_isbn13
  FROM universe_series us
  JOIN series s ON s.id = us.series_id
  WHERE us.universe_id = p_universe_id
  ORDER BY us.position;
$$;

GRANT EXECUTE ON FUNCTION public.get_universe_series(UUID) TO anon, authenticated;

-- 6. Standalone books in a universe --------------------------------------------
DROP FUNCTION IF EXISTS public.get_universe_standalones(UUID);
CREATE OR REPLACE FUNCTION public.get_universe_standalones(p_universe_id UUID)
RETURNS TABLE (
  position NUMERIC,
  isbn13   TEXT,
  title    TEXT,
  image    TEXT,
  pub_year INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    ub.position,
    public.canonical_isbn_for_group(ub.book_group_id) AS isbn13,
    b.title,
    b.image,
    CASE
      WHEN b.date_published IS NOT NULL AND length(b.date_published) >= 4
      THEN cast(substring(b.date_published, 1, 4) AS INTEGER)
      ELSE NULL
    END AS pub_year
  FROM universe_books ub
  LEFT JOIN books b ON b.isbn13 = public.canonical_isbn_for_group(ub.book_group_id)
  WHERE ub.universe_id = p_universe_id
  ORDER BY ub.position;
$$;

GRANT EXECUTE ON FUNCTION public.get_universe_standalones(UUID) TO anon, authenticated;

-- 7. Sitemap feeds -------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_series_for_sitemap();
CREATE OR REPLACE FUNCTION public.get_series_for_sitemap()
RETURNS TABLE (slug TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT s.slug
  FROM series s
  WHERE EXISTS (SELECT 1 FROM series_items si WHERE si.series_id = s.id);
$$;
GRANT EXECUTE ON FUNCTION public.get_series_for_sitemap() TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_universes_for_sitemap();
CREATE OR REPLACE FUNCTION public.get_universes_for_sitemap()
RETURNS TABLE (slug TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT u.slug
  FROM universes u
  WHERE EXISTS (SELECT 1 FROM universe_series us WHERE us.universe_id = u.id)
     OR EXISTS (SELECT 1 FROM universe_books ub WHERE ub.universe_id = u.id);
$$;
GRANT EXECUTE ON FUNCTION public.get_universes_for_sitemap() TO anon, authenticated;

-- 8. Series-for-isbn — used by the book page to link to its series ------------
DROP FUNCTION IF EXISTS public.get_series_for_isbn(TEXT);
CREATE OR REPLACE FUNCTION public.get_series_for_isbn(p_isbn13 TEXT)
RETURNS TABLE (
  series_id UUID,
  name      TEXT,
  slug      TEXT,
  position  NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.id, s.name, s.slug, si.position
  FROM book_isbn_groups big
  JOIN series_items si ON si.book_group_id = big.group_id
  JOIN series s ON s.id = si.series_id
  WHERE big.isbn13 = p_isbn13
  ORDER BY si.position
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_series_for_isbn(TEXT) TO anon, authenticated;
