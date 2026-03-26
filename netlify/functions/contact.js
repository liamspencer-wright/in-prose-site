// Contact form handler
// Required env vars (set in Netlify dashboard):
//   TURNSTILE_SECRET_KEY    — from Cloudflare Turnstile dashboard
//   RESEND_API_KEY          — from Resend dashboard
//   CONTACT_EMAIL           — destination email (default: liam.inprose+webfeedback@gmail.com)

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid request body" }),
    };
  }

  const { category, subject, message, email, userId, token } = body;

  if (!category || !subject || !message || !token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields" }),
    };
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
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Captcha verification failed" }),
    };
  }

  // Send email via Resend
  const to = process.env.CONTACT_EMAIL || "liam.inprose+webfeedback@gmail.com";

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "in prose <noreply@inprose.co.uk>",
      to: [to],
      subject: `[${category}] ${subject}`,
      text: [
        `Category: ${category}`,
        `Subject: ${subject}`,
        `From: ${email || "unknown"} (${userId || "unknown"})`,
        "",
        message,
      ].join("\n"),
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.json().catch(() => ({}));
    console.error("Resend error:", emailRes.status, err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to send message" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
