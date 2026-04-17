import { AuthError } from "@supabase/supabase-js";

const KNOWN_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Incorrect email or password. Please try again.",
  "Email not confirmed": "Please check your email and confirm your account before logging in.",
  "User already registered": "An account with this email already exists. Try logging in instead.",
  "Signup requires a valid password": "Please enter a valid password.",
  "Password should be at least 6 characters":
    "Your password must be at least 6 characters.",
  "Email rate limit exceeded":
    "Too many attempts. Please wait a few minutes and try again.",
  "For security purposes, you can only request this after 60 seconds":
    "Please wait a moment before trying again.",
};

const FALLBACK =
  "Something went wrong. Please try again, or contact us at support@inprose.co.uk if it keeps happening.";

export function friendlyAuthError(error: AuthError): string {
  const known = KNOWN_MESSAGES[error.message];
  if (known) return known;

  if (error.message.toLowerCase().includes("rate limit")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }

  console.error("[auth error]", error.message, error.status);
  return FALLBACK;
}
