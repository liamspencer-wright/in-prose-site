/**
 * scripts/seo/news-audit.ts
 *
 * Lists every published news post + how many internal programmatic links its
 * body contains. Articles with < 3 are flagged — the editorial calendar
 * (#186) requires every piece to link to ≥ 3 programmatic pages.
 *
 * Run via:
 *   tsx scripts/seo/news-audit.ts
 *
 * Reads from Supabase via the anon key (no service role needed; news_posts
 * has a public-read RLS for status='published').
 */

const REQUIRED_LINKS = 3;
const SITE_HOST = "inprose.co.uk";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in env."
  );
  process.exit(1);
}

type NewsPost = {
  slug: string;
  title: string;
  body: string;
  type: string;
  published_at: string | null;
};

const ROUTE_RE = new RegExp(
  `${escapeRe(SITE_HOST)}/(book|authors|series|universes|lists|browse)/[A-Za-z0-9_\\-/]+`,
  "g"
);

async function main() {
  const url = `${SUPABASE_URL}/rest/v1/news_posts?status=eq.published&select=slug,title,body,type,published_at&order=published_at.desc`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) {
    console.error(`fetch failed ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const posts = (await res.json()) as NewsPost[];

  console.log(
    `News audit — ${posts.length} published post${posts.length === 1 ? "" : "s"}\n`
  );

  let lacking = 0;
  for (const p of posts) {
    const matches = (p.body ?? "").match(ROUTE_RE) ?? [];
    const unique = new Set(matches);
    const flagged = unique.size < REQUIRED_LINKS;
    if (flagged) lacking++;
    console.log(
      `[${flagged ? "❗" : "✓"}] ${unique.size} link${unique.size === 1 ? "" : "s"}  ${p.slug.padEnd(40)}  ${p.title}`
    );
  }

  console.log(
    `\n${lacking} / ${posts.length} post${posts.length === 1 ? "" : "s"} below the ≥${REQUIRED_LINKS} programmatic-link bar.`
  );
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
