import { NextResponse } from "next/server";
import { detectAiReferrer, isLoggablePath } from "@/lib/seo/ai-referrer";

/**
 * POST /api/seo/referrer
 *
 * Beacon endpoint. The browser-side `<AiReferrerBeacon />` posts here when it
 * detects an inbound visit from a known AI assistant chat UI. Writes to
 * `seo_referrer_events` via the service role.
 */

type Body = {
  path: string;
  referrer: string | null;
  userAgent: string | null;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body.path || !isLoggablePath(body.path)) {
    return NextResponse.json({ ok: false, reason: "skipped" });
  }

  // Re-detect on the server to avoid clients fabricating sources.
  const headers = new Headers();
  if (body.referrer) headers.set("referer", body.referrer);
  if (body.userAgent) headers.set("user-agent", body.userAgent);

  const hit = detectAiReferrer(headers);
  if (!hit) return NextResponse.json({ ok: false, reason: "no-match" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    // Don't 500 — measurement should never break a public request path.
    return NextResponse.json({ ok: false, reason: "no-service-role" });
  }

  const country = req.headers.get("x-country") ?? null; // Netlify edge sets this in some configs

  const res = await fetch(`${supabaseUrl}/rest/v1/seo_referrer_events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      referrer_host: hit.referrerHost,
      source: hit.source,
      path: body.path.slice(0, 500),
      user_agent: body.userAgent?.slice(0, 500) ?? null,
      country,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, reason: "insert-failed" });
  }

  return NextResponse.json({ ok: true });
}
