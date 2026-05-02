# Content brief — [working title]

> Use this template when commissioning a new article for the news system.
> Save a copy under `local-workspace/briefs/<slug>.md` (gitignored) before
> drafting.

## Goal

- **Primary target query:** "..."
- **Search intent:** informational | navigational | commercial
- **Pillar or supporting:** pillar | supporting (link to parent cluster in `docs/SEO_EDITORIAL_CALENDAR.md`)

## Lead paragraph (write first)

Two sentences max. Self-contained. Answers the page's primary question without needing context. AI assistants lift this verbatim — write it like a search snippet.

## Outline

- H1: [final title]
- H2 sections (at least 4):
  1. ...
  2. ...
  3. ...
  4. ...

Each H2 should answer one question. Bullets for facts, prose for context.

## Internal links (≥ 3)

Required: every article links to at least 3 programmatic pages. List them upfront so the writer doesn't forget.

| Anchor text | Target URL | Rationale |
|---|---|---|
| ... | /authors/[slug] | ... |
| ... | /browse/[facet]/[slug] | ... |
| ... | /lists/[slug] | ... |

## Source data (from in prose)

What proprietary data informs this piece? Examples:
- Community-rating ranking from `get_top_rated_by_genre`
- Enrichment consensus from `book_enrichment_consensus`
- Series reading order from `get_series_members`

Cite the in-app source visibly in the article — differentiates us from regurgitated summaries.

## External sources

Where applicable. Link out to authoritative sources (Wikipedia, author site, publisher) so AI citation works both directions.

## FAQ (optional but encouraged)

Three to five Q+A pairs at the bottom of the article. Format as `<dl>` so the news article schema can extend `mainEntity.mentions[]` cleanly. Each Q ends with a question mark.

## Cross-posting

- [ ] inprose.co.uk (canonical)
- [ ] Substack (only if pillar; canonical points back to inprose.co.uk)
- [ ] Medium / LinkedIn (only if pillar)

## Promotion (optional)

- Twitter / Bluesky thread highlighting one striking data point + link.
- Email newsletter — schedule for the next digest.
