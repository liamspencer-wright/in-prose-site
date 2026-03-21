"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      trimmed,
      { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` }
    );
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <Image
        src="/logo.png"
        alt="in prose logo"
        width={120}
        height={120}
        className="mb-8 h-auto w-[120px]"
        priority
      />

      <div className="w-full max-w-sm rounded-(--radius-card) border border-border-subtle bg-bg-medium p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        {sent ? (
          <div className="text-center">
            <h1 className="mb-4 text-3xl font-bold text-accent">
              Check your email
            </h1>
            <p className="text-lg text-text-muted">
              We&apos;ve sent a password reset link to{" "}
              <strong>{email.trim()}</strong>.
            </p>
            <p className="mt-6">
              <Link href="/login" className="text-accent hover:underline">
                Back to login
              </Link>
            </p>
          </div>
        ) : (
          <>
            <h1 className="mb-2 text-center text-3xl font-bold">
              Forgot password
            </h1>
            <p className="mb-6 text-center text-sm text-text-muted">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email address"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif text-lg outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
              />

              {error && <p className="text-sm text-error">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full cursor-pointer rounded-(--radius-input) bg-accent px-6 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-text-muted">
              <Link href="/login" className="text-accent hover:underline">
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
