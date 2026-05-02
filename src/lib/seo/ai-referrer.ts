/**
 * Detect requests arriving from known AI assistant interfaces.
 *
 * Used in middleware to log into `seo_referrer_events` so the SEO dashboard
 * can show how much traffic comes from AI-mediated discovery.
 *
 * Detection sources:
 *  - `Referer` header host matches known AI chat UI
 *  - `User-Agent` matches known AI live-serving bot (the bot fetches on a
 *    user's behalf during a chat — distinct from the training crawlers)
 */

const HOST_TO_SOURCE: Record<string, string> = {
  "chatgpt.com": "chatgpt",
  "chat.openai.com": "chatgpt",
  "perplexity.ai": "perplexity",
  "www.perplexity.ai": "perplexity",
  "claude.ai": "claude",
  "gemini.google.com": "gemini",
  "you.com": "you",
  "phind.com": "phind",
  "bing.com": "bing-chat",
  "www.bing.com": "bing-chat",
  "copilot.microsoft.com": "copilot",
};

const UA_PATTERNS: Array<{ pattern: RegExp; source: string }> = [
  { pattern: /OAI-SearchBot/i, source: "chatgpt" },
  { pattern: /ChatGPT-User/i, source: "chatgpt" },
  { pattern: /PerplexityBot/i, source: "perplexity" },
  { pattern: /claude-web/i, source: "claude" },
  { pattern: /Anthropic-AI/i, source: "claude" },
];

export type AiReferrerHit = {
  source: string;
  referrerHost: string;
};

/**
 * Returns the AI source for this request, or null if it doesn't look like
 * AI-mediated traffic.
 */
export function detectAiReferrer(headers: Headers): AiReferrerHit | null {
  const referer = headers.get("referer") ?? headers.get("referrer");
  if (referer) {
    try {
      const host = new URL(referer).hostname.toLowerCase();
      const source = HOST_TO_SOURCE[host];
      if (source) return { source, referrerHost: host };
    } catch {
      // Invalid URL in Referer — ignore.
    }
  }

  const ua = headers.get("user-agent") ?? "";
  if (ua) {
    for (const { pattern, source } of UA_PATTERNS) {
      if (pattern.test(ua)) {
        return { source, referrerHost: ua.split(" ")[0]?.toLowerCase() ?? "ua" };
      }
    }
  }

  return null;
}

/**
 * Decide whether this request URL is interesting enough to log.
 * Skip API/static/auth/admin paths to keep the events table clean.
 */
export function isLoggablePath(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/_next/")) return false;
  if (pathname.startsWith("/auth/")) return false;
  if (pathname.startsWith("/admin")) return false;
  if (pathname === "/robots.txt") return false;
  if (pathname === "/sitemap.xml") return false;
  if (pathname.startsWith("/llms")) return false;
  return true;
}
