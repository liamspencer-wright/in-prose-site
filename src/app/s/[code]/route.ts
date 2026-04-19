import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code || code.length < 4) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = request.headers.get("user-agent") ?? "";
  const referrer = request.headers.get("referer") ?? "";
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const fingerprint = createHash("sha256").update(`${ip}:${userAgent}`).digest("hex");

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/log_link_click`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      p_short_code: code,
      p_ip_hash: ipHash,
      p_user_agent: userAgent.slice(0, 500),
      p_referrer: referrer.slice(0, 1000),
      p_visitor_fingerprint: fingerprint,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = await res.json();

  if (!data.found) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bookUrl = new URL(`/book/${data.isbn13}`, request.url);
  bookUrl.searchParams.set("shared_by", data.user_id);

  return NextResponse.redirect(bookUrl.toString(), 302);
}
