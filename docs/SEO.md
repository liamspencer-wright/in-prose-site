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

> Implemented under
> [#188](https://github.com/liamspencer-wright/in-prose-site/issues/188).

- Google Search Console + Bing Webmaster Tools verified; sitemap submitted.
- IndexNow ping fires on publish/update of public routes (book, author, list,
  series, universe, news, browse).
- Internal `/admin/seo` dashboard surfaces weekly metrics from Search Console,
  RUM, and AI-referrer logs.
- AI-referrer detection logs every request whose `Referer` matches a known AI
  host (chat.openai.com, chatgpt.com, perplexity.ai, claude.ai,
  gemini.google.com, you.com, phind.com, bing.com/chat) into `analytics_events`
  with type `seo_ai_referrer`.
- Citation tracking script runs a fixed test set of book-recommendation prompts
  weekly against ChatGPT/Perplexity/Claude/Gemini and records whether
  inprose.co.uk is cited.

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
