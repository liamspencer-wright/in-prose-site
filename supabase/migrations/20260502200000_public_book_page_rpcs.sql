-- ============================================================================
-- Public book page RPCs — surface reviews + more-by-author for crawlers / AI
-- ============================================================================
-- The existing user_books RLS only exposes a user's own rows; the public book
-- page (in-prose-site /book/[isbn]) cannot read public reviews directly.
-- These SECURITY DEFINER functions expose a curated, public-safe slice.
-- ============================================================================

-- 1. Public reviews for one ISBN -------------------------------------------------
DROP FUNCTION IF EXISTS public.get_public_reviews_for_isbn(TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.get_public_reviews_for_isbn(
  p_isbn13 TEXT,
  p_limit  INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id      UUID,
  display_name TEXT,
  username     TEXT,
  avatar_url   TEXT,
  badge_type   TEXT,
  rating       NUMERIC,
  review       TEXT,
  finished_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    ub.user_id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.badge_type,
    ub.rating,
    ub.review,
    ub.finished_at,
    ub.created_at
  FROM user_books ub
  JOIN profiles p ON p.id = ub.user_id
  WHERE ub.isbn13 = p_isbn13
    AND ub.visibility = 'public'
    AND ub.review IS NOT NULL
    AND length(trim(ub.review)) > 0
    AND p.username IS NOT NULL
  ORDER BY
    -- Most recently finished first; fall back to created_at for unfinished
    COALESCE(ub.finished_at, ub.created_at) DESC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_reviews_for_isbn(TEXT, INTEGER) TO anon, authenticated;

-- 2. Other books by the same author --------------------------------------------
-- Returns top N other books by the primary author of the given ISBN, ordered
-- by published date desc, with simple metadata for card rendering.
DROP FUNCTION IF EXISTS public.get_more_books_by_author(TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.get_more_books_by_author(
  p_isbn13 TEXT,
  p_limit  INTEGER DEFAULT 6
)
RETURNS TABLE (
  isbn13         TEXT,
  title          TEXT,
  image          TEXT,
  date_published TEXT,
  pub_year       INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH primary_author AS (
    SELECT a.id AS author_id
    FROM book_authors ba
    JOIN authors a ON a.id = ba.author_id
    WHERE ba.isbn13 = p_isbn13
    ORDER BY ba.ord
    LIMIT 1
  )
  SELECT
    b.isbn13,
    b.title,
    b.image,
    b.date_published,
    CASE
      WHEN b.date_published IS NOT NULL AND length(b.date_published) >= 4
      THEN cast(substring(b.date_published, 1, 4) AS INTEGER)
      ELSE NULL
    END AS pub_year
  FROM book_authors ba
  JOIN books b ON b.isbn13 = ba.isbn13
  WHERE ba.author_id = (SELECT author_id FROM primary_author)
    AND ba.isbn13 <> p_isbn13
  ORDER BY b.date_published DESC NULLS LAST
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_more_books_by_author(TEXT, INTEGER) TO anon, authenticated;

-- 3. Public review counts for AggregateRating ----------------------------------
-- The /book/[isbn] page already pulls community_rating + ratings_count from
-- books_expanded; this returns the count of *public + has-review* rows so the
-- Review array stays consistent with the AggregateRating count.
DROP FUNCTION IF EXISTS public.get_public_review_summary_for_isbn(TEXT);
CREATE OR REPLACE FUNCTION public.get_public_review_summary_for_isbn(
  p_isbn13 TEXT
)
RETURNS TABLE (
  review_count BIGINT,
  avg_rating   DOUBLE PRECISION
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    count(*)::bigint AS review_count,
    avg(ub.rating)::double precision AS avg_rating
  FROM user_books ub
  WHERE ub.isbn13 = p_isbn13
    AND ub.visibility = 'public'
    AND ub.review IS NOT NULL
    AND length(trim(ub.review)) > 0;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_review_summary_for_isbn(TEXT) TO anon, authenticated;
