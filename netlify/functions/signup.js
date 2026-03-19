// Beta signup handler
// Required env vars (set in Netlify dashboard):
//   TURNSTILE_SECRET_KEY  — from Cloudflare Turnstile dashboard
//   SUPABASE_URL          — e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY — from Supabase project settings > API

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  const { name, email, token } = body;

  if (!name || !email || !token) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid email address" }) };
  }

  // Validate Cloudflare Turnstile token
  const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
    }),
  });

  const turnstileData = await turnstileRes.json();
  if (!turnstileData.success) {
    return { statusCode: 400, body: JSON.stringify({ error: "Captcha verification failed" }) };
  }

  // Insert into Supabase (service role bypasses RLS)
  const supabaseRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/signups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase() }),
  });

  if (!supabaseRes.ok) {
    const err = await supabaseRes.json().catch(() => ({}));

    // Unique constraint violation = duplicate email
    if (supabaseRes.status === 409 || err.code === "23505") {
      return { statusCode: 409, body: JSON.stringify({ error: "already_signed_up" }) };
    }

    console.error("Supabase insert error:", supabaseRes.status, err);
    return { statusCode: 500, body: JSON.stringify({ error: "Database error" }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
