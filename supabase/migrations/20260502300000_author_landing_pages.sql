-- ============================================================================
-- Author landing pages — public RPCs + slug helpers
-- ============================================================================
-- Supports /authors/[slug] on inprose.co.uk (in-prose-site #177).
--
-- Slug strategy: <slugified-name>-<first-8-hex-of-author-id>
--   e.g. "madeline-miller-a1b2c3d4"
-- The id-prefix disambiguates authors that share a name; renames don't break
-- existing URLs (slug always resolves via the prefix).
-- ============================================================================

-- 1. Slugify helper -----------------------------------------------------------
DROP FUNCTION IF EXISTS public.author_slug(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.author_slug(p_id UUID, p_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    nullif(
      regexp_replace(
        regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g'),
        '^-+|-+$', '', 'g'
      ),
      ''
    )
    || '-' || substring(p_id::text, 1, 8);
$$;

GRANT EXECUTE ON FUNCTION public.author_slug(UUID, TEXT) TO anon, authenticated;

-- Functional index so slug -> author lookup is fast.
CREATE INDEX IF NOT EXISTS idx_authors_id_prefix
  ON public.authors ((substring(id::text, 1, 8)));

-- 2. Look up author + summary by slug -----------------------------------------
DROP FUNCTION IF EXISTS public.get_author_by_slug(TEXT);
CREATE OR REPLACE FUNCTION public.get_author_by_slug(p_slug TEXT)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  sort_name   TEXT,
  slug        TEXT,
  book_count  BIGINT,
  earliest_year INTEGER,
  latest_year   INTEGER,
  top_genres  TEXT[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH prefix AS (
    SELECT substring(p_slug FROM '[0-9a-f]{8}$') AS p
  ),
  candidate AS (
    SELECT a.*
    FROM authors a, prefix
    WHERE prefix.p IS NOT NULL
      AND substring(a.id::text, 1, 8) = prefix.p
    LIMIT 1
  ),
  works AS (
    SELECT
      b.isbn13,
      CASE
        WHEN b.date_published IS NOT NULL AND length(b.date_published) >= 4
        THEN cast(substring(b.date_published, 1, 4) AS INTEGER)
        ELSE NULL
      END AS pub_year
    FROM book_authors ba
    JOIN books b ON b.isbn13 = ba.isbn13
    JOIN candidate c ON c.id = ba.author_id
  ),
  genre_counts AS (
    SELECT s.name, count(*) AS n
    FROM works w
    JOIN book_subjects bs ON bs.isbn13 = w.isbn13
    JOIN subjects s ON s.id = bs.subject_id
    GROUP BY s.name
    ORDER BY n DESC
    LIMIT 5
  )
  SELECT
    c.id,
    c.name,
    c.sort_name,
    public.author_slug(c.id, c.name) AS slug,
    (SELECT count(*) FROM works) AS book_count,
    (SELECT min(pub_year) FROM works) AS earliest_year,
    (SELECT max(pub_year) FROM works) AS latest_year,
    (SELECT array_agg(name ORDER BY n DESC) FROM genre_counts) AS top_genres
  FROM candidate c;
$$;

GRANT EXECUTE ON FUNCTION public.get_author_by_slug(TEXT) TO anon, authenticated;

-- 3. List works for an author -------------------------------------------------
DROP FUNCTION IF EXISTS public.get_works_for_author(UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.get_works_for_author(
  p_author_id UUID,
  p_limit     INTEGER DEFAULT 60
)
RETURNS TABLE (
  isbn13         TEXT,
  title          TEXT,
  image          TEXT,
  date_published TEXT,
  pub_year       INTEGER,
  pages          INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    b.isbn13,
    b.title,
    b.image,
    b.date_published,
    CASE
      WHEN b.date_published IS NOT NULL AND length(b.date_published) >= 4
      THEN cast(substring(b.date_published, 1, 4) AS INTEGER)
      ELSE NULL
    END AS pub_year,
    b.pages
  FROM book_authors ba
  JOIN books b ON b.isbn13 = ba.isbn13
  WHERE ba.author_id = p_author_id
  ORDER BY b.date_published DESC NULLS LAST, b.title
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_works_for_author(UUID, INTEGER) TO anon, authenticated;

-- 4. Sitemap feed -------------------------------------------------------------
-- Returns every author with at least one book, with their canonical slug.
DROP FUNCTION IF EXISTS public.get_authors_for_sitemap();
CREATE OR REPLACE FUNCTION public.get_authors_for_sitemap()
RETURNS TABLE (
  id   UUID,
  slug TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    a.id,
    public.author_slug(a.id, a.name) AS slug
  FROM authors a
  WHERE EXISTS (SELECT 1 FROM book_authors ba WHERE ba.author_id = a.id);
$$;

GRANT EXECUTE ON FUNCTION public.get_authors_for_sitemap() TO anon, authenticated;

-- 5. Slug for one author by ID — used by the book page to link to the author --
DROP FUNCTION IF EXISTS public.get_author_slug_for_isbn(TEXT);
CREATE OR REPLACE FUNCTION public.get_author_slug_for_isbn(p_isbn13 TEXT)
RETURNS TABLE (
  author_id UUID,
  name      TEXT,
  slug      TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    a.id,
    a.name,
    public.author_slug(a.id, a.name)
  FROM book_authors ba
  JOIN authors a ON a.id = ba.author_id
  WHERE ba.isbn13 = p_isbn13
  ORDER BY ba.ord
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_author_slug_for_isbn(TEXT) TO anon, authenticated;
