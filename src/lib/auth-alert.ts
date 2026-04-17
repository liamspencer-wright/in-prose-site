import { AuthError } from "@supabase/supabase-js";

const EXPECTED_ERRORS = new Set([
  "Invalid login credentials",
  "Email not confirmed",
  "User already registered",
  "Signup requires a valid password",
  "Password should be at least 6 characters",
  "Email rate limit exceeded",
  "For security purposes, you can only request this after 60 seconds",
]);

export function reportAuthFailure(
  error: AuthError,
  page: "signup" | "login",
  method: "email" | "apple" | "google",
  email?: string,
) {
  if (EXPECTED_ERRORS.has(error.message)) return;
  if (error.message.toLowerCase().includes("rate limit")) return;

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-admin-alert`;

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      event_type: "auth_failure",
      email: email || undefined,
      error_message: error.message,
      error_code: error.status?.toString(),
      page,
      method,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});
}
