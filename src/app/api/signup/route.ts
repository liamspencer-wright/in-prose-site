import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, email, token } = body;

  if (!name || !email || !token) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Validate Cloudflare Turnstile token
  const turnstileRes = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    }
  );

  const turnstileData = await turnstileRes.json();
  if (!turnstileData.success) {
    return NextResponse.json({ error: "Captcha verification failed" }, { status: 400 });
  }

  // Insert into Supabase (service role bypasses RLS)
  const supabaseRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/signups`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
      }),
    }
  );

  if (!supabaseRes.ok) {
    const err = await supabaseRes.json().catch(() => ({}));

    // Unique constraint violation = duplicate email
    if (supabaseRes.status === 409 || err.code === "23505") {
      return NextResponse.json({ error: "already_signed_up" }, { status: 409 });
    }

    console.error("Supabase insert error:", supabaseRes.status, err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
