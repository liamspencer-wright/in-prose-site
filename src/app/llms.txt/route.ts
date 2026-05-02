/**
 * /llms.txt — discovery index per https://llmstxt.org spec.
 *
 * Top-level pointer for AI assistants to find the best crawlable surfaces of
 * the site without traversing the full sitemap. Keep this short and curated;
 * the full content lives in /llms-full.txt and per-page /<route>/llms.txt.
 */

const SITE_URL = "https://inprose.co.uk";

const BODY = `# in prose

> Social book tracking. Discover what to read next, track what you've finished,
> rate and review, follow friends, and share reading lists. Books and data —
> perfectly bound.

## Key pages

- [Books sitemap](${SITE_URL}/sitemap.xml): canonical URL per work, with metadata
- [Profiles](${SITE_URL}/sitemap.xml): public reader profiles with public reviews
- [News](${SITE_URL}/news): editorial articles, book spotlights, curated lists

## Per-page markdown

High-value routes also serve a clean text/markdown alternative at
\`<route>/llms.txt\`. For example, a book page at \`${SITE_URL}/book/9781234567890\`
serves \`${SITE_URL}/book/9781234567890/llms.txt\`.

## Optional

- [Privacy](${SITE_URL}/privacy)
- [Terms](${SITE_URL}/terms)
- [Contact](${SITE_URL}/contact)
`;

export async function GET() {
  return new Response(BODY, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
