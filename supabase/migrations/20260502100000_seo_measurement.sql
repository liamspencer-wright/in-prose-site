-- ============================================================================
-- SEO measurement infra: AI-referrer events + weekly metric snapshots
-- ============================================================================
-- Supports the measurement pillar of the SEO + AI discoverability epic
-- (in-prose-site #174 / sub-issue #188).
--
-- Two tables:
--   seo_referrer_events — one row per public-page request that arrives from
--     a known AI assistant (ChatGPT, Perplexity, Claude, Gemini, Bing chat, etc.).
--   seo_metrics_snapshots — weekly aggregate metrics for the /admin/seo dashboard.
-- ============================================================================

-- Referrer events ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.seo_referrer_events (
  id           BIGSERIAL   PRIMARY KEY,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  referrer_host TEXT       NOT NULL,
  source       TEXT        NOT NULL,                          -- e.g. "chatgpt", "perplexity", "claude", "gemini", "bing-chat"
  path         TEXT        NOT NULL,                          -- e.g. "/book/9780141439518"
  user_agent   TEXT,
  country      TEXT
);

CREATE INDEX IF NOT EXISTS idx_seo_referrer_events_occurred_at
  ON public.seo_referrer_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_seo_referrer_events_source
  ON public.seo_referrer_events (source, occurred_at DESC);

ALTER TABLE public.seo_referrer_events ENABLE ROW LEVEL SECURITY;

-- Server-side writes only (service role bypasses RLS); admins can read.
DROP POLICY IF EXISTS "seo_referrer_events_admin_select" ON public.seo_referrer_events;
CREATE POLICY "seo_referrer_events_admin_select"
  ON public.seo_referrer_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Weekly snapshot table ------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.seo_metrics_snapshots (
  id              BIGSERIAL    PRIMARY KEY,
  captured_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  -- Search Console
  gsc_clicks      INTEGER,
  gsc_impressions INTEGER,
  gsc_avg_position NUMERIC(6, 2),
  gsc_indexed     INTEGER,
  -- Bing
  bing_clicks     INTEGER,
  bing_impressions INTEGER,
  bing_indexed    INTEGER,
  -- AI referrers
  ai_referrers_total INTEGER,
  ai_referrers_by_source JSONB,
  -- Citations (from scripts/seo/citation-check.ts)
  citation_test_set INTEGER,
  citation_hits     INTEGER,
  -- Free-form notes for the human reviewer
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_seo_metrics_captured_at
  ON public.seo_metrics_snapshots (captured_at DESC);

ALTER TABLE public.seo_metrics_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seo_metrics_snapshots_admin_select" ON public.seo_metrics_snapshots;
CREATE POLICY "seo_metrics_snapshots_admin_select"
  ON public.seo_metrics_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );
