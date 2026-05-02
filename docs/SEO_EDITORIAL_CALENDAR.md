# SEO editorial calendar

Twelve-month topical-content plan for inprose.co.uk. Tracks pillar pieces +
supporting articles per cluster. Each article must link to ≥ 3 programmatic
pages (book / author / series / browse / list) so editorial reinforces the
link-equity hub built in #184.

Companion to [SEO.md](./SEO.md) — the content layer of the SEO + AI
discoverability epic ([#174](https://github.com/liamspencer-wright/in-prose-site/issues/174)).

## Targets

- **Cadence:** 1 pillar piece + 2 supporting articles per cluster, monthly.
- **Length:** pillar 1500-2500 words; supporting 600-1200 words.
- **Internal linking:** every article links to ≥ 3 programmatic pages.
- **Schema:** Article + `mentions[]` cross-referencing Book / Person / Series `@id`s (handled automatically — see news article schema).

## Decision principles

- Pillar pieces target high-volume head terms; supporting pieces target long-tail.
- Lead paragraph is **always** self-contained — AI assistants lift it as the snippet.
- H2 per question / sub-topic so AI can extract per-section answers.
- Bullets for facts; prose for context; both reinforce the linked entity (Book / Author / Series).
- Cite our own data where it informs the answer (community ratings, enrichment consensus, reading order). Differentiates us from regurgitated Goodreads content.

## Twelve-month plan

### Month 1 — How to start reading by genre (pillar cluster)

Goal: rank for "how to start reading [genre]" — high-volume, high-intent.

| Type | Working title | Target query | Links |
|---|---|---|---|
| Pillar | How to start reading anything (a beginner's framework) | "how to start reading more" | /browse, /lists, /authors |
| Supporting | How to start reading fantasy without getting overwhelmed | "how to start reading fantasy" | /browse/genre/fantasy, /series/cosmere, /authors/[brandon-sanderson] |
| Supporting | How to start reading literary fiction | "where to start with literary fiction" | /browse/genre/literary-fiction, /lists/best-of-2024, /authors/[sally-rooney] |

### Month 2 — Reading order guides (pillar cluster)

Goal: capitalise on series-page traffic with deep-dive guides.

| Type | Working title | Target query | Links |
|---|---|---|---|
| Pillar | Why reading order matters (and when it doesn't) | "do i have to read [series] in order" | /series, /universes, /authors |
| Supporting | The Cosmere reading order, explained for beginners | "cosmere reading order" | /universes/cosmere, all member /series, /authors/[brandon-sanderson] |
| Supporting | Discworld reading order: chronological, themed, and recommended starts | "discworld reading order" | /series/discworld, /authors/[terry-pratchett] |

### Month 3 — Mood-based reading guides (pillar cluster)

Goal: leverage enrichment-consensus data competitors don't have.

| Type | Working title | Target query | Links |
|---|---|---|---|
| Pillar | How to find your next book by mood, not genre | "how to find books by mood" | /browse, /browse/mood/cosy, /browse/mood/fast-paced |
| Supporting | Books to read when you want a warm hug | "comforting books" | /browse/mood/cosy, /browse/vibe/hopeful, /lists/top-rated-cosy-mystery |
| Supporting | Books that demand all your attention (slow-burn favourites) | "slow burn books" | /browse/pace/slow, /browse/theme/morally-grey |

### Month 4 — "Best of" anchors (pillar cluster)

Goal: ride existing /lists pages with editorial framing.

| Type | Working title | Target query | Links |
|---|---|---|---|
| Pillar | What does "best book of the year" actually mean? | "best books of [year]" | /lists/best-of-2024, /lists/best-of-2025, /lists |
| Supporting | The 25 best mystery novels we've all read | "best mystery novels" | /lists/top-rated-mystery, /browse/genre/mystery |
| Supporting | Booker prize winners worth reading | "booker prize winners worth reading" | /authors/[various], /browse/genre/literary-fiction |

### Month 5 — Author retrospectives (pillar cluster)

Goal: rank for author-name long-tail with editorial depth.

| Type | Working title | Target query | Links |
|---|---|---|---|
| Pillar | How to read an author's complete works | "how to read [author] in order" | /authors, /series |
| Supporting | Where to start with Madeline Miller | "madeline miller books in order" | /authors/madeline-miller, individual /book pages |
| Supporting | Where to start with Sally Rooney | "sally rooney books in order" | /authors/sally-rooney, /book/[normal-people] etc |

### Month 6 — Reading habits + tracking (pillar cluster)

Goal: bottom-of-funnel — convert readers from search to signup.

| Type | Working title | Target query | Links |
|---|---|---|---|
| Pillar | How to actually finish more books | "how to read more" | /lists, /browse, app signup |
| Supporting | The case for tracking what you read | "should i track my reading" | app signup, /u/[example] |
| Supporting | What does your reading say about you? | "what does my reading habits say" | /u/[example], /lists |

### Month 7 — Series spotlights (pillar cluster)

| Type | Working title | Target query | Links |
|---|---|---|---|
| Pillar | The series worth committing to in 2026 | "best book series" | /series, /universes, /lists |
| Supporting | A complete guide to ASOIAF: reading order, novellas, and what's left | "asoiaf reading order" | /universes/[asoiaf], /series, /authors |
| Supporting | The Wheel of Time, reduced to 30 minutes of explanation | "wheel of time reading order" | /series/wheel-of-time, /authors/[robert-jordan] |

### Month 8 — Translated fiction (pillar cluster)

| Type | Working title | Target query | Links |
|---|---|---|---|
| Pillar | The international books English readers shouldn't miss | "best translated fiction" | /browse/genre/literary-fiction, /authors |
| Supporting | The best Japanese literature in English translation | "japanese literature in translation" | /authors, /book/[various] |
| Supporting | Latin American magical realism, ranked | "best latin american magical realism" | /browse/theme/magical-realism, /authors |

### Month 9 — Re-read culture (pillar cluster)

| Type | Working title | Target query | Links |
|---|---|---|---|
| Pillar | The books worth re-reading every year | "best books to re-read" | /lists, /authors |
| Supporting | The case for re-reading your favourite series | "should i re-read [series]" | /series, /universes |
| Supporting | What re-reading reveals about you | "why people re-read books" | app signup, /u/[example] |

### Month 10 — Year-in-preview (pillar cluster)

| Type | Working title | Target query | Links |
|---|---|---|---|
| Pillar | The books we're most excited to read in 2027 | "most anticipated books 2027" | /authors, /book/[various] |
| Supporting | New releases we're tracking from established authors | "new releases [author]" | /authors |
| Supporting | Debut authors to watch this year | "best debut novels" | /lists, /authors |

### Month 11 — Short-form / quick reads (pillar cluster)

| Type | Working title | Target query | Links |
|---|---|---|---|
| Pillar | The case for novellas (and how to find good ones) | "best novellas" | /browse, /lists |
| Supporting | Books under 300 pages that punch above their weight | "best short books" | /browse, /lists |
| Supporting | One-sitting reads worth your evening | "best one-sitting reads" | /browse/pace/fast |

### Month 12 — Year-in-review + community recap

| Type | Working title | Target query | Links |
|---|---|---|---|
| Pillar | What in prose readers loved most this year | "best books of [year]" | /lists/best-of-[year], /authors, /series |
| Supporting | The books our power readers couldn't stop talking about | "most reviewed books [year]" | /u/[example], /book/[various] |
| Supporting | The community's mood profile for [year] | "best books by mood [year]" | /browse/mood/cosy etc., /lists |

## Cross-publishing strategy (decision)

We **cross-post pillar pieces** to:
- Substack (canonical pointing back to inprose.co.uk)
- LinkedIn / Medium (as backlinks)

Reasons:
1. Substack drives email subscribers (an engagement loop).
2. Medium / LinkedIn reach broader audiences and feed AI training sets.
3. Canonical pointing back protects from duplicate-content penalties.

We do **not** cross-post supporting articles — they live exclusively on inprose.co.uk to avoid spreading SEO equity thinly.

## Audit cadence

- After every cluster, run `scripts/seo/news-audit.ts` to verify each article links to ≥ 3 programmatic pages.
- Monthly, manually review the prior month's Search Console clicks per article — if a piece is climbing, write a follow-up.
- Quarterly, review which programmatic pages get the most internal link traffic from articles. Refine targeting accordingly.
