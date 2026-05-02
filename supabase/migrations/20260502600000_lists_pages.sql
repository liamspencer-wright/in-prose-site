-- ============================================================================
-- Computed list pages — public RPCs
-- ============================================================================
-- Supports /lists + /lists/[slug] on inprose.co.uk (#180).
-- MVP scope: computed lists only (editorial CMS deferred). Two slug patterns:
--   * top-rated-<genre-slug>      — top-rated books in a genre
--   * best-of-<year>              — best-rated books published that year
--
-- Ranking: Bayesian-ish weighted score that prevents single 10/10 ratings
--   from dominating low-vote books:
--     score = (avg * count + global_avg * 5) / (count + 5)
--   The +5 prior pulls toward the global average until enough votes exist.
-- ============================================================================

-- 1. Top rated by genre --------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_top_rated_by_genre(TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.get_top_rated_by_genre(
  p_slug  TEXT,
  p_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
  isbn13            TEXT,
  title             TEXT,
  image             TEXT,
  pub_year          INTEGER,
  first_author_name TEXT,
  avg_rating        NUMERIC,
  rating_count      INTEGER,
  weighted_score    NUMERIC,
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
    SELECT b.isbn13, b.title, b.image, b.date_published
    FROM book_subjects bs
    JOIN subj ON subj.id = bs.subject_id
    JOIN books b ON b.isbn13 = bs.isbn13
  ),
  ratings AS (
    SELECT
      ub.isbn13,
      avg(ub.rating)::numeric AS avg_rating,
      count(ub.rating)::integer AS rating_count
    FROM user_books ub
    WHERE ub.visibility = 'public'
      AND ub.rating IS NOT NULL
      AND ub.isbn13 IN (SELECT isbn13 FROM works)
    GROUP BY ub.isbn13
  ),
  global_avg AS (
    SELECT
      coalesce(avg(avg_rating), 7.0)::numeric AS g
    FROM ratings
    WHERE rating_count >= 2
  ),
  scored AS (
    SELECT
      r.isbn13,
      r.avg_rating,
      r.rating_count,
      (
        (r.avg_rating * r.rating_count + (SELECT g FROM global_avg) * 5)
        / (r.rating_count + 5)
      ) AS weighted_score
    FROM ratings r
    WHERE r.rating_count >= 2
  )
  SELECT
    s.isbn13,
    w.title,
    w.image,
    CASE
      WHEN w.date_published IS NOT NULL AND length(w.date_published) >= 4
      THEN cast(substring(w.date_published, 1, 4) AS INTEGER)
      ELSE NULL
    END AS pub_year,
    (
      SELECT a.name
      FROM book_authors ba
      JOIN authors a ON a.id = ba.author_id
      WHERE ba.isbn13 = s.isbn13
      ORDER BY ba.ord
      LIMIT 1
    ) AS first_author_name,
    s.avg_rating,
    s.rating_count,
    s.weighted_score,
    (SELECT name FROM subj) AS genre_label,
    (SELECT count(*) FROM scored) AS total_in_genre
  FROM scored s
  JOIN works w ON w.isbn13 = s.isbn13
  ORDER BY s.weighted_score DESC, s.rating_count DESC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_top_rated_by_genre(TEXT, INTEGER) TO anon, authenticated;

-- 2. Best of year --------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_best_of_year(INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.get_best_of_year(
  p_year  INTEGER,
  p_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
  isbn13            TEXT,
  title             TEXT,
  image             TEXT,
  pub_year          INTEGER,
  first_author_name TEXT,
  avg_rating        NUMERIC,
  rating_count      INTEGER,
  weighted_score    NUMERIC,
  total_for_year    BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH works AS (
    SELECT b.isbn13, b.title, b.image, b.date_published
    FROM books b
    WHERE b.date_published IS NOT NULL
      AND length(b.date_published) >= 4
      AND substring(b.date_published, 1, 4) = p_year::text
  ),
  ratings AS (
    SELECT
      ub.isbn13,
      avg(ub.rating)::numeric AS avg_rating,
      count(ub.rating)::integer AS rating_count
    FROM user_books ub
    WHERE ub.visibility = 'public'
      AND ub.rating IS NOT NULL
      AND ub.isbn13 IN (SELECT isbn13 FROM works)
    GROUP BY ub.isbn13
  ),
  global_avg AS (
    SELECT coalesce(avg(avg_rating), 7.0)::numeric AS g
    FROM ratings
    WHERE rating_count >= 2
  ),
  scored AS (
    SELECT
      r.isbn13,
      r.avg_rating,
      r.rating_count,
      (
        (r.avg_rating * r.rating_count + (SELECT g FROM global_avg) * 5)
        / (r.rating_count + 5)
      ) AS weighted_score
    FROM ratings r
    WHERE r.rating_count >= 2
  )
  SELECT
    s.isbn13,
    w.title,
    w.image,
    p_year AS pub_year,
    (
      SELECT a.name
      FROM book_authors ba
      JOIN authors a ON a.id = ba.author_id
      WHERE ba.isbn13 = s.isbn13
      ORDER BY ba.ord
      LIMIT 1
    ) AS first_author_name,
    s.avg_rating,
    s.rating_count,
    s.weighted_score,
    (SELECT count(*) FROM scored) AS total_for_year
  FROM scored s
  JOIN works w ON w.isbn13 = s.isbn13
  ORDER BY s.weighted_score DESC, s.rating_count DESC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_best_of_year(INTEGER, INTEGER) TO anon, authenticated;

-- 3. Sitemap feed --------------------------------------------------------------
-- Lists need ≥10 qualifying books (≥2 ratings each) to be worth indexing.
DROP FUNCTION IF EXISTS public.get_lists_for_sitemap();
CREATE OR REPLACE FUNCTION public.get_lists_for_sitemap()
RETURNS TABLE (
  slug  TEXT,
  kind  TEXT,
  total BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH public_ratings AS (
    SELECT ub.isbn13, ub.rating
    FROM user_books ub
    WHERE ub.visibility = 'public' AND ub.rating IS NOT NULL
  ),
  per_book AS (
    SELECT isbn13, count(*)::integer AS rating_count
    FROM public_ratings
    GROUP BY isbn13
    HAVING count(*) >= 2
  ),
  -- Top-rated by genre
  by_genre AS (
    SELECT
      'top-rated-' || public.facet_slugify(s.name) AS slug,
      'top-rated-genre' AS kind,
      count(DISTINCT pb.isbn13)::bigint AS total
    FROM per_book pb
    JOIN book_subjects bs ON bs.isbn13 = pb.isbn13
    JOIN subjects s ON s.id = bs.subject_id
    GROUP BY s.name
    HAVING count(DISTINCT pb.isbn13) >= 10
  ),
  -- Best of year
  by_year AS (
    SELECT
      'best-of-' || substring(b.date_published, 1, 4) AS slug,
      'best-of-year' AS kind,
      count(DISTINCT pb.isbn13)::bigint AS total
    FROM per_book pb
    JOIN books b ON b.isbn13 = pb.isbn13
    WHERE b.date_published IS NOT NULL AND length(b.date_published) >= 4
    GROUP BY substring(b.date_published, 1, 4)
    HAVING count(DISTINCT pb.isbn13) >= 10
  )
  SELECT slug, kind, total FROM by_genre
  UNION ALL
  SELECT slug, kind, total FROM by_year
  ORDER BY kind, total DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_lists_for_sitemap() TO anon, authenticated;
