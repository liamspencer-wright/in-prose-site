"use client";

import { useEffect } from "react";

/**
 * Fires once on mount. If `document.referrer` matches a known AI chat UI,
 * posts a beacon to /api/seo/referrer so we can count AI-mediated traffic.
 *
 * Render on every public page (book, profile, news, home, future
 * authors/series/browse/lists). One-off — keep the side effect cheap.
 */
export function AiReferrerBeacon() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const referrer = document.referrer;
    if (!referrer) return;

    let host: string;
    try {
      host = new URL(referrer).hostname.toLowerCase();
    } catch {
      return;
    }

    // Same source list as src/lib/seo/ai-referrer.ts. Server re-checks before
    // writing, so client-side false positives don't pollute the events table.
    const AI_HOSTS = new Set([
      "chatgpt.com",
      "chat.openai.com",
      "perplexity.ai",
      "www.perplexity.ai",
      "claude.ai",
      "gemini.google.com",
      "you.com",
      "phind.com",
      "bing.com",
      "www.bing.com",
      "copilot.microsoft.com",
    ]);

    if (!AI_HOSTS.has(host)) return;

    // Fire-and-forget; sendBeacon is non-blocking.
    const payload = JSON.stringify({
      path: window.location.pathname,
      referrer,
      userAgent: navigator.userAgent,
    });

    if ("sendBeacon" in navigator) {
      navigator.sendBeacon(
        "/api/seo/referrer",
        new Blob([payload], { type: "application/json" })
      );
    } else {
      void fetch("/api/seo/referrer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        /* never crash a render over telemetry */
      });
    }
  }, []);

  return null;
}
