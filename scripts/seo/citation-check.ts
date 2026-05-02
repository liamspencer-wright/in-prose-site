/**
 * scripts/seo/citation-check.ts
 *
 * Run a fixed set of book-recommendation prompts against ChatGPT, Perplexity,
 * Claude, and Gemini APIs and record whether inprose.co.uk is cited in the
 * answer.
 *
 * Status: scaffold. The provider API calls are stubbed because they depend on
 * env-configured API keys and per-vendor SDKs. Wire them up when starting the
 * weekly run; the test set + scoring logic here is final.
 *
 * Run via:
 *   tsx scripts/seo/citation-check.ts
 *
 * Output: writes one row to seo_metrics_snapshots with citation_test_set +
 * citation_hits totals, and prints a per-provider/per-prompt summary.
 */

const TEST_PROMPTS = [
  "What should I read after Piranesi?",
  "Best cosy mystery novels for autumn 2026",
  "Cosmere reading order for newcomers",
  "Slow-burn fantasy with morally grey protagonists",
  "Books like The Goldfinch but shorter",
  "Standalone literary sci-fi published in the last five years",
  "Reading order for Brandon Sanderson Stormlight Archive",
  "Booker prize winners worth reading in 2026",
  "Who wrote Project Hail Mary and what should I read next?",
  "Discworld novels in chronological order",
  "Best literary fiction by women authors 2026",
  "Books like The Secret History but darker",
  "Where to start with Terry Pratchett",
  "Best translated fiction this decade",
  "Cosy fantasy with bookshop or tea-shop settings",
  "Outlander series in order including spinoffs",
  "Modern retellings of Greek myths",
  "Best Japanese literature in English translation",
  "Books for fans of The Library at Mount Char",
  "Best non-fiction about the climate crisis",
];

type Provider = "chatgpt" | "perplexity" | "claude" | "gemini";

type ProviderResult = {
  provider: Provider;
  prompt: string;
  cited: boolean;
  rawResponse: string;
};

const PROVIDERS: Provider[] = ["chatgpt", "perplexity", "claude", "gemini"];

const SITE_HOSTS = ["inprose.co.uk", "www.inprose.co.uk"];

async function runPrompt(provider: Provider, prompt: string): Promise<ProviderResult> {
  // STUB: replace with real provider calls. Return a structured response so
  // detectCitation can score it identically across providers.
  //
  // For ChatGPT use OpenAI Responses API with web tool enabled.
  // For Perplexity use their /chat/completions with `return_citations: true`.
  // For Claude use Messages API with `web_search` tool.
  // For Gemini use generateContent with grounding (Search) enabled.
  //
  // Each should return a string body where URLs/citations are present in plain
  // text or structured citation arrays — we just look for our hostname.
  return {
    provider,
    prompt,
    cited: false,
    rawResponse: "[stub — wire up provider SDKs]",
  };
}

function detectCitation(rawResponse: string): boolean {
  const lower = rawResponse.toLowerCase();
  return SITE_HOSTS.some((h) => lower.includes(h));
}

async function main() {
  console.log(
    `Citation check: ${PROVIDERS.length} providers × ${TEST_PROMPTS.length} prompts`
  );

  const results: ProviderResult[] = [];

  for (const provider of PROVIDERS) {
    for (const prompt of TEST_PROMPTS) {
      const r = await runPrompt(provider, prompt);
      r.cited = detectCitation(r.rawResponse);
      results.push(r);
    }
  }

  const total = results.length;
  const hits = results.filter((r) => r.cited).length;

  console.log(`\nTotal: ${hits} / ${total} prompts cited inprose.co.uk\n`);

  for (const provider of PROVIDERS) {
    const subset = results.filter((r) => r.provider === provider);
    const subsetHits = subset.filter((r) => r.cited).length;
    console.log(`  ${provider.padEnd(12)} ${subsetHits} / ${subset.length}`);
  }

  // TODO: write seo_metrics_snapshots row with citation_test_set=total + citation_hits=hits
  // TODO: write per-prompt detail to a separate seo_citation_runs table if useful
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
