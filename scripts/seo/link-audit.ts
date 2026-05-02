/**
 * scripts/seo/link-audit.ts
 *
 * Crawls a sample of the live site and reports orphan pages (≤ 1 incoming
 * internal link). Designed to run weekly — not in PR CI — because the full
 * crawl is too slow for a per-PR gate.
 *
 * Run via:
 *   tsx scripts/seo/link-audit.ts [--site=https://inprose.co.uk] [--max=500]
 *
 * Sample strategy:
 *   1. Fetch /sitemap.xml; treat its URL list as ground truth for "should be
 *      reachable".
 *   2. Crawl up to MAX pages BFS-from-home; collect all internal links.
 *   3. For each sitemap URL, count how many crawled pages link to it.
 *   4. Print a sorted report — pages with < 2 incoming links are flagged.
 *
 * Exit code: 0 always (this is informational, not gating). Adjust if you
 * want it to fail CI.
 */

const SITE = parseArg("--site") ?? "https://inprose.co.uk";
const MAX = Number(parseArg("--max") ?? "500");
const ORPHAN_THRESHOLD = 2;

type CrawlResult = {
  outgoingLinks: Map<string, Set<string>>; // page -> set of internal links it contains
  incomingCounts: Map<string, number>;     // page -> number of incoming internal links
};

async function main() {
  console.log(`Link audit: ${SITE}, max=${MAX}, orphan-threshold<${ORPHAN_THRESHOLD}`);

  const sitemapUrls = await fetchSitemap(`${SITE}/sitemap.xml`);
  console.log(`Sitemap URLs: ${sitemapUrls.length}`);

  const result = await crawlBfs(SITE, MAX);
  console.log(`Crawled pages: ${result.outgoingLinks.size}`);

  const orphans: Array<{ url: string; incoming: number }> = [];
  for (const url of sitemapUrls) {
    const count = result.incomingCounts.get(url) ?? 0;
    if (count < ORPHAN_THRESHOLD) orphans.push({ url, incoming: count });
  }

  orphans.sort((a, b) => a.incoming - b.incoming || a.url.localeCompare(b.url));

  console.log(`\nOrphans (< ${ORPHAN_THRESHOLD} incoming internal links):`);
  for (const o of orphans.slice(0, 100)) {
    console.log(`  ${o.incoming.toString().padStart(3)}  ${o.url}`);
  }
  if (orphans.length > 100) {
    console.log(`  ... ${orphans.length - 100} more`);
  }
  console.log(`\nTotal orphans: ${orphans.length} / ${sitemapUrls.length}`);
}

async function fetchSitemap(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`sitemap fetch ${res.status}: ${url}`);
  const xml = await res.text();
  const urls: string[] = [];
  // crude but adequate — sitemap is always well-formed
  const re = /<loc>([^<]+)<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    urls.push(m[1].trim());
  }
  return urls;
}

async function crawlBfs(origin: string, max: number): Promise<CrawlResult> {
  const result: CrawlResult = {
    outgoingLinks: new Map(),
    incomingCounts: new Map(),
  };
  const queue: string[] = [origin];
  const seen = new Set<string>([origin]);

  while (queue.length > 0 && result.outgoingLinks.size < max) {
    const url = queue.shift()!;
    let html: string;
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("text/html")) continue;
      html = await res.text();
    } catch {
      continue;
    }

    const links = extractInternalLinks(html, origin);
    result.outgoingLinks.set(url, new Set(links));

    for (const link of links) {
      result.incomingCounts.set(link, (result.incomingCounts.get(link) ?? 0) + 1);
      if (!seen.has(link) && result.outgoingLinks.size + queue.length < max) {
        seen.add(link);
        queue.push(link);
      }
    }
  }
  return result;
}

function extractInternalLinks(html: string, origin: string): string[] {
  const out = new Set<string>();
  const re = /<a\s[^>]*href=["']([^"'#?]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1];
    let url: URL;
    try {
      url = new URL(raw, origin);
    } catch {
      continue;
    }
    if (url.origin !== origin) continue;
    // Strip query + hash to dedupe
    out.add(url.origin + url.pathname.replace(/\/$/, ""));
  }
  return Array.from(out);
}

function parseArg(name: string): string | null {
  const arg = process.argv.find((a) => a.startsWith(`${name}=`));
  return arg ? arg.split("=", 2)[1] : null;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
