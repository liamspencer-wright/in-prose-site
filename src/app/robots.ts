import type { MetadataRoute } from "next";

// Public routes that crawlers should index.
// Listed explicitly so any new authenticated/private routes default to disallow.
const PUBLIC_ALLOW = [
  "/",
  "/book/",
  "/u/",
  "/news/",
  "/authors/",
  "/series/",
  "/universes/",
  "/browse/",
  "/lists/",
  "/privacy",
  "/terms",
  "/contact",
];

const PRIVATE_DISALLOW = [
  "/library",
  "/library/",
  "/friends",
  "/friends/",
  "/account",
  "/account/",
  "/settings",
  "/settings/",
  "/feed",
  "/feed/",
  "/search",
  "/search/",
  "/import",
  "/import/",
  "/admin",
  "/admin/",
  "/login",
  "/signup",
  "/signup-success",
  "/forgot-password",
  "/reset-password",
  "/confirmed",
  "/auth/",
  "/api/",
  "/offline",
];

// AI bots we explicitly welcome — they surface us in user-facing AI products
// (ChatGPT browsing, Perplexity citations, Gemini AI Overviews, etc.).
// Same allow/disallow policy as default *, but listed explicitly so the policy
// is visible in robots.txt.
// See docs/SEO.md for rationale.
const AI_BOTS_ALLOW = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "claude-web",
  "Anthropic-AI",
  "PerplexityBot",
  "Google-Extended",
  "Bingbot",
  "CCBot",
];

// Scrapers + bots without a clear user-facing product. Disallowed wholesale.
const SCRAPER_BOTS_DISALLOW = [
  "Bytespider",
  "Amazonbot",
  "DataForSeoBot",
  "MJ12bot",
  "SemrushBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: AI_BOTS_ALLOW,
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: SCRAPER_BOTS_DISALLOW,
        disallow: "/",
      },
    ],
    sitemap: "https://inprose.co.uk/sitemap.xml",
    host: "https://inprose.co.uk",
  };
}
