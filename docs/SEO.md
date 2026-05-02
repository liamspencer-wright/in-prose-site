# SEO + AI discoverability

Technical reference for the SEO + AI discoverability work tracked under epic
[#174](https://github.com/liamspencer-wright/in-prose-site/issues/174).
This doc captures the long-lived policy decisions; the per-pillar implementation
details live in the relevant code under `src/app/`, `src/lib/seo/`, and the
sitemap/robots generators.

## Goals

1. **Traditional search** — rank on Google + Bing for book, author, series,
   genre, mood, and "best of" queries.
2. **AI assistants** — be a source ChatGPT, Claude, Perplexity, Gemini, and
   Google AI Overviews cite for book recommendations and reading order
   questions.

## Current scope (this doc)

This file documents what shipped under sub-issues
[#175](https://github.com/liamspencer-wright/in-prose-site/issues/175),
[#176](https://github.com/liamspencer-wright/in-prose-site/issues/176),
[#185](https://github.com/liamspencer-wright/in-prose-site/issues/185), and
[#188](https://github.com/liamspencer-wright/in-prose-site/issues/188) — the
foundation phase. New SEO-affecting work should append a section here.

## Robots policy

`src/app/robots.ts` is the single source of truth.

- **Allow**: `/`, `/book/`, `/u/`, `/news/`, `/authors/`, `/series/`,
  `/universes/`, `/browse/`, `/lists/`, `/privacy`, `/terms`, `/contact`.
- **Disallow**: every authenticated route, `/api/`, `/admin/`, auth flow URLs,
  `/offline`.
- AI-specific user-agents are added in [#185](#ai-crawler-policy).
- New public route patterns must be added to `PUBLIC_ALLOW`. New protected
  routes default to disallow only if their prefix matches `PRIVATE_DISALLOW`;
  add the prefix when introducing a new auth area.

## Sitemap

`src/app/sitemap.ts` returns a single dynamic sitemap covering:

- 5 static pages (home, news, privacy, terms, contact)
- All canonical books (deduplicated via `book_isbn_groups`)
- All public profiles (users with a `username`)
- All published news posts

### When to split

Google + Bing cap a single sitemap at **50,000 URLs / 50 MB uncompressed**.
Once the canonical book set exceeds ~40,000, split via Next's
[`generateSitemaps`](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap#generating-multiple-sitemaps)
into per-type child sitemaps and serve a sitemap index. The child sitemaps
should be:

- `sitemap-books-{N}.xml` (paginated, 40k per shard)
- `sitemap-authors.xml`
- `sitemap-series.xml`
- `sitemap-universes.xml`
- `sitemap-browse.xml`
- `sitemap-profiles.xml`
- `sitemap-news.xml`
- `sitemap-lists.xml`

## Edition canonicalisation

Books with multiple ISBNs (paperback, hardback, audio, regional editions) are
linked via `book_isbn_groups` (see iOS app migration `20260329100000`). To
avoid duplicate-content competition, every public book URL must canonicalise
to one ISBN per group.

### Algorithm

`src/lib/seo/canonical.ts` exports `getCanonicalIsbn(isbn)`:

1. Look up the requested ISBN in `book_isbn_groups`. If not present, the ISBN
   is its own canonical.
2. If present, fetch all ISBNs in the same group with their `date_published`.
3. Pick the canonical: **earliest `date_published`** (first edition); ties
   broken by lexicographic min `isbn13`.

`buildCanonicalIndex(isbns[])` does the same in batch for the sitemap.

### Why earliest publish wins

First editions are the most authoritative SEO signal: Wikipedia + library
catalogues tend to reference them, AI training sets quote them, and "books by
[author]" lists are usually chronological. Picking earliest gives us alignment
with external sources.

### Behaviour on book pages

`src/app/book/[isbn]/page.tsx`:

- If the requested ISBN is **not** the canonical one, returns a 301
  (`permanentRedirect`) to `/book/{canonical}`, preserving the `shared_by`
  query string.
- Always emits `<link rel="canonical">` and OG `url` pointing to the canonical
  URL via `metadata.alternates.canonical`.

## 404 / 410 / `noindex`

- `src/app/not-found.tsx` sets `robots: { index: false, follow: false }`. Any
  route calling `notFound()` therefore returns a `noindex` 404.
- A formal 410 (gone) flow for deleted profiles + removed books is **not
  implemented yet**. To do this properly we need to retain a record of
  deleted slugs (deletion request rows persist post-deletion only briefly).
  Track via [#175](https://github.com/liamspencer-wright/in-prose-site/issues/175)
  follow-up if/when traffic warrants.

## AI crawler policy

> Implemented under
> [#185](https://github.com/liamspencer-wright/in-prose-site/issues/185).
> This section documents the resulting policy; see that issue for rationale.

We **allow** the following bots — they cite or surface us in user-facing AI
products, which is a primary distribution channel:

- `GPTBot` (OpenAI training)
- `OAI-SearchBot` + `ChatGPT-User` (ChatGPT browsing on user's behalf)
- `ClaudeBot` + `claude-web` + `Anthropic-AI` (Anthropic)
- `PerplexityBot` (Perplexity)
- `Google-Extended` (Gemini training; separate from regular Googlebot)
- `Bingbot` (Bing + Copilot)
- `CCBot` (Common Crawl — feeds many model training sets)

We **disallow** bots that consume bandwidth without clear benefit:

- `Bytespider`
- `Amazonbot`
- `DataForSeoBot`
- `MJ12bot`
- `SemrushBot`

Any new AI bot should default-allow unless it's purely a scraper (no surfacing
in a user-facing product). Document the decision here when policy changes.

## `llms.txt`

We serve `/llms.txt` per the [llmstxt.org](https://llmstxt.org) spec and
`/llms-full.txt` with concatenated markdown of top public pages. Per-page
markdown alternatives are exposed at `[route]/llms.txt` for the highest-value
routes (book, author, series, lists). Linked from each page via
`<link rel="alternate" type="text/markdown">`.

See [#185](https://github.com/liamspencer-wright/in-prose-site/issues/185) for
implementation.

## AI-friendly content guidelines

Apply to every public template:

- **First paragraph self-contained**. AI assistants lift the lead as a snippet;
  it must answer the page's primary question without needing context.
- **Single `<h1>`** per page, semantic `<h2>` per section.
- **Stable section IDs** (`#reading-order`, `#reviews`, `#faq`) for deep-linking
  and citation.
- **Fact density**: bullets for facts, prose for context.
- **No hidden content**: tabs render as anchor sections in the HTML; do not
  hide content behind client-only fetches.
- **Source attribution**: where a fact is sourced from third-party data
  (ISBNdb, OpenLibrary), say so visibly.

## Schema.org

`src/lib/seo/schema.ts` is the single source for JSON-LD. See
[#176](https://github.com/liamspencer-wright/in-prose-site/issues/176) for the
builder list and per-route wiring.

Site-wide:
- `Organization` + `WebSite` (with `SearchAction` for sitelinks searchbox)
  emitted from `src/app/layout.tsx`.

Per-route schemas live in their respective `page.tsx` files via the centralised
builders.

## Measurement

> Foundation shipped under
> [#188](https://github.com/liamspencer-wright/in-prose-site/issues/188);
> Search Console / Bing API ingestion + citation tracker still TODO.

### Verification

Google Search Console + Bing Webmaster verification meta tags are env-driven:

```env
GOOGLE_SITE_VERIFICATION=...
BING_SITE_VERIFICATION=...
```

`src/app/layout.tsx` injects them via `metadata.verification`. After verifying,
submit `https://inprose.co.uk/sitemap.xml` to both consoles.

### IndexNow

- Lib: `src/lib/seo/indexnow.ts` — `pingIndexNow(urls[])`,
  `pingIndexNowOne(url)`. No-op when `INDEXNOW_KEY` env is unset.
- Key file: served at `/<INDEXNOW_KEY>.txt` via `middleware.ts` (validation
  endpoint Bing/Yandex fetch to confirm ownership).
- Wire-in points: news post publish flow; book/author/list/series page changes
  once those routes ship. Add inside the relevant write path; failures must
  not block the user-facing action.

### AI-referrer detection

Two-path strategy:

1. **Client beacon** — `<AiReferrerBeacon />` (rendered globally from
   `src/app/layout.tsx`) reads `document.referrer` on mount, posts to
   `/api/seo/referrer` if the host matches a known AI chat UI. Uses
   `navigator.sendBeacon` for fire-and-forget.
2. **Server-side detection** — same logic in `src/lib/seo/ai-referrer.ts`
   re-runs on the API endpoint to gate writes (clients can't fabricate
   sources). Headers-based UA detection for live-serving bots
   (`OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `claude-web`,
   `Anthropic-AI`) is in the same module but is **not yet wired** — UA-bot
   logging from middleware is deferred (would require fire-and-forget edge
   logic; current solution covers human chat-UI traffic which is the
   higher-value bucket).

Detected sources: `chatgpt`, `perplexity`, `claude`, `gemini`, `you`, `phind`,
`bing-chat`, `copilot`. New sources: extend `HOST_TO_SOURCE` in
`src/lib/seo/ai-referrer.ts` and the matching `AI_HOSTS` set in the beacon.

Events land in `seo_referrer_events` (`occurred_at`, `referrer_host`,
`source`, `path`, `user_agent`, `country`). RLS allows admins to read.

### Internal dashboard

`/admin/seo` (admin-only via `src/app/admin/layout.tsx`) shows:

- AI-referrer event totals + per-source breakdown (last 7d / 30d)
- Recent events stream
- Latest weekly snapshot from `seo_metrics_snapshots` (empty until cron is wired)
- Configuration checklist for env vars

### Citation tracker

`scripts/seo/citation-check.ts` — scaffold with a final test set of 20
book-recommendation prompts and provider-agnostic scoring. Provider SDK calls
are stubbed; wire them up when starting the weekly run. Output writes a row to
`seo_metrics_snapshots` with `citation_test_set` + `citation_hits`.

### Deferred

- Daily Search Console + Bing Webmaster API ingestion populating the
  `gsc_*`/`bing_*` columns of `seo_metrics_snapshots`. Needs OAuth setup; not
  blocking the foundation.
- UA-based AI-bot logging from middleware (training crawler hits visible in
  raw access logs for now).
- Brand SERP knowledge-panel monitoring with alert on regression.
- IndexNow integration with news publish flow + future content routes.

## Performance

> Implemented under
> [#187](https://github.com/liamspencer-wright/in-prose-site/issues/187).

### Budgets

Defined in `src/lib/perf/budgets.ts`. Match Google's "good" thresholds (75th
percentile):

| Metric | Budget |
|---|---|
| LCP | < 2500 ms |
| INP | < 200 ms |
| CLS | < 0.1 |
| FCP | < 1800 ms |
| TTFB | < 600 ms |
| Initial JS (gzipped) | < 150 KB |

### Real User Monitoring

`<WebVitalsBeacon />` (rendered globally from `src/app/layout.tsx`) subscribes
to LCP / INP / CLS / FCP / TTFB via the [`web-vitals`](https://github.com/GoogleChrome/web-vitals)
library and pings `/api/web-vitals`. The endpoint writes to
`web_vitals_events` (admin-readable RLS) via the service role.

Aggregate p75 per-route via the SEO dashboard once volume is sufficient.

### Lighthouse CI

GitHub Actions workflow `.github/workflows/lighthouse.yml` runs on every PR
to `dev` / `main`:
- Builds the site with the production env vars.
- Runs Lighthouse CI against `/`, `/news`, `/browse`, `/lists` (representative
  templates — extend as new public templates ship).
- Asserts performance ≥ 0.85, SEO ≥ 0.95, with per-metric warnings for LCP,
  CLS, FCP, server-response-time, total-byte-weight.
- Uploads to temporary public storage; link appears in the PR check.

Config in `lighthouserc.json`.

### Deferred (#187 follow-ups)

- Image CDN routing — pre-existing setup; not blocking the budget.
- Bundle analyzer report in CI — easy follow-up via `next-bundle-analyzer`.
- Nightly sitemap-driven smoke perf — needs separate workflow + alert wiring.
- Critical CSS inline + non-critical CSS defer — Tailwind already produces
  small CSS; revisit only if Lighthouse flags it.

## Quick reference: where things live

| Concern | File / route |
|---|---|
| Robots policy | `src/app/robots.ts` |
| Sitemap | `src/app/sitemap.ts` |
| Edition canonical | `src/lib/seo/canonical.ts` |
| JSON-LD builders | `src/lib/seo/schema.ts` |
| `llms.txt` | `src/app/llms.txt/route.ts` |
| `llms-full.txt` | `src/app/llms-full.txt/route.ts` |
| Per-page markdown | `src/app/book/[isbn]/llms.txt/route.ts`, etc. |
| IndexNow ping | `src/lib/seo/indexnow.ts` |
| AI-referrer logging | `middleware.ts` (or `src/lib/seo/ai-referrer.ts`) |
| Internal dashboard | `src/app/admin/seo/page.tsx` |
| Site footer hub | `src/components/site-footer.tsx` |
| Link audit script | `scripts/seo/link-audit.ts` |
| Web Vitals beacon | `src/components/seo/web-vitals.tsx` + `src/app/api/web-vitals/route.ts` |
| Perf budgets | `src/lib/perf/budgets.ts` |
| Lighthouse CI | `.github/workflows/lighthouse.yml` + `lighthouserc.json` |
