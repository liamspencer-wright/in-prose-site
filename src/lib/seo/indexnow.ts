/**
 * IndexNow — protocol-level "tell us this URL changed" ping for Bing + Yandex
 * (and others that join the IndexNow consortium). Free, idempotent, instant
 * indexing requests.
 *
 * https://www.indexnow.org/
 *
 * Usage:
 *   import { pingIndexNow } from "@/lib/seo/indexnow";
 *   await pingIndexNow(["https://inprose.co.uk/news/foo"]);
 *
 * Configuration:
 *   - Set INDEXNOW_KEY in env to a 8–128 hex/numeric string. We serve it at
 *     `/<key>.txt` (see src/app/[indexnow-key].txt) so search engines can
 *     verify ownership.
 *   - Calls become no-ops if INDEXNOW_KEY is missing — safe to deploy without.
 */

const ENDPOINT = "https://api.indexnow.org/indexnow";
const HOST = "inprose.co.uk";

export type IndexNowResult =
  | { ok: true; status: number }
  | { ok: false; reason: "no-key" | "no-urls" | "request-failed"; status?: number };

export async function pingIndexNow(urls: string[]): Promise<IndexNowResult> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return { ok: false, reason: "no-key" };
  if (urls.length === 0) return { ok: false, reason: "no-urls" };

  // IndexNow caps at 10,000 URLs per request. We cap at 1,000 to stay polite.
  const trimmed = urls.slice(0, 1000);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        host: HOST,
        key,
        keyLocation: `https://${HOST}/${key}.txt`,
        urlList: trimmed,
      }),
    });

    if (!res.ok) {
      return { ok: false, reason: "request-failed", status: res.status };
    }
    return { ok: true, status: res.status };
  } catch {
    return { ok: false, reason: "request-failed" };
  }
}

/**
 * Convenience: ping for a single URL. Common case for news publish, profile
 * username change, etc.
 */
export function pingIndexNowOne(url: string): Promise<IndexNowResult> {
  return pingIndexNow([url]);
}
