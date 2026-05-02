/**
 * Core Web Vitals budgets for inprose.co.uk.
 *
 * Numbers match Google's "good" thresholds (75th percentile) so a route that
 * stays inside these budgets is eligible for the "Good" Search Console
 * Core Web Vitals report. Lighthouse CI enforces them per-template.
 */

export const PERF_BUDGETS = {
  LCP_MS: 2500, // Largest Contentful Paint
  INP_MS: 200, // Interaction to Next Paint
  CLS: 0.1,    // Cumulative Layout Shift
  FCP_MS: 1800, // First Contentful Paint (informational)
  TTFB_MS: 600, // Time to First Byte
  INITIAL_JS_KB: 150, // gzipped JS shipped on first load per template
} as const;

/** Templates Lighthouse CI checks on every PR. Match `lighthouserc.json`. */
export const TEMPLATE_URLS = [
  "/",
  "/news",
  "/browse",
  "/lists",
] as const;
