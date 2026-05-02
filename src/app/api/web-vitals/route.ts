import { NextResponse } from "next/server";

/**
 * POST /api/web-vitals
 *
 * Beacon endpoint for Core Web Vitals from <WebVitalsBeacon />. Writes to
 * web_vitals_events via the service role. Never blocks user requests —
 * any failure returns ok:false silently.
 */

type Body = {
  route: string;
  metric: "LCP" | "INP" | "CLS" | "FCP" | "TTFB";
  value: number;
  rating?: "good" | "needs-improvement" | "poor";
  navigationType?: string;
};

const VALID_METRICS = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (
    !body.route ||
    !VALID_METRICS.has(body.metric) ||
    typeof body.value !== "number" ||
    !Number.isFinite(body.value)
  ) {
    return NextResponse.json({ ok: false, reason: "invalid" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, reason: "no-service-role" });
  }

  // Strip query + hash defensively; should already be pathname.
  const route = body.route.split("?")[0].split("#")[0].slice(0, 500);
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
  const country = req.headers.get("x-country") ?? null;

  const res = await fetch(`${supabaseUrl}/rest/v1/web_vitals_events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      route,
      metric: body.metric,
      value: body.value,
      rating: body.rating ?? null,
      navigation_type: body.navigationType ?? null,
      user_agent: userAgent,
      country,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, reason: "insert-failed" });
  }
  return NextResponse.json({ ok: true });
}
