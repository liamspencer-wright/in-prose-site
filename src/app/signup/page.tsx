"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { reportAuthFailure } from "@/lib/auth-alert";
import Image from "next/image";
import Link from "next/link";

async function handleOAuthSignUp(
  provider: "apple" | "google",
  setError: (msg: string) => void,
) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) {
    reportAuthFailure(error, "signup", provider);
    setError(friendlyAuthError(error));
  }
}

function passwordMeetsRequirements(pwd: string) {
  return {
    length: pwd.length >= 8,
    lower: /[a-z]/.test(pwd),
    upper: /[A-Z]/.test(pwd),
    digit: /[0-9]/.test(pwd),
    symbol: /[^A-Za-z0-9]/.test(pwd),
  };
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const reqs = passwordMeetsRequirements(password);
  const allMet =
    reqs.length && reqs.lower && reqs.upper && reqs.digit && reqs.symbol;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (!confirmPassword) {
      setError("Please confirm your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!allMet) {
      setError("Please satisfy all password requirements.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (authError) {
      reportAuthFailure(authError, "signup", "email", trimmedEmail);
      setError(friendlyAuthError(authError));
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
        <Image
          src="/logo.png"
          alt="in prose logo"
          width={120}
          height={120}
          className="mb-8 h-auto w-[120px]"
        />
        <div className="w-full max-w-sm rounded-(--radius-card) border border-border-subtle bg-bg-medium p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h1 className="mb-4 text-3xl font-bold text-accent">Check your email</h1>
          <p className="text-lg text-text-muted">
            We&apos;ve sent a confirmation link to <strong>{email.trim()}</strong>.
            Please check your inbox and click the link to verify your account.
          </p>
          <p className="mt-6">
            <Link href="/login" className="text-accent hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    );
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

      <div className="w-full max-w-sm rounded-(--radius-card) border border-border-subtle bg-bg-medium p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] max-sm:p-5">
        <h1 className="mb-6 text-center text-3xl font-bold">Sign up</h1>

        <div className="mb-4 flex flex-col gap-4">
          <button
            type="button"
            onClick={() => handleOAuthSignUp("apple", setError)}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-(--radius-input) bg-black px-6 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88"
          >
            <svg className="h-5 w-5" viewBox="0 0 17 20" fill="currentColor">
              <path d="M13.545 10.239c-.022-2.234 1.823-3.306 1.906-3.358-.037-.054-1.494-1.422-1.906-1.76-.404-.331-1.218-.78-2.04-.78-.868 0-1.626.519-2.052.519-.433 0-1.09-.505-1.793-.491-.923.014-1.774.537-2.249 1.364-1.585 2.747-.405 6.816 1.139 9.046.754 1.091 1.655 2.316 2.838 2.272 1.139-.046 1.568-.737 2.945-.737 1.37 0 1.764.737 2.945.714 1.225-.019 2.002-1.112 2.748-2.208.866-1.266 1.224-2.491 1.245-2.554-.027-.012-2.388-.916-2.412-3.636l-.014-.191zM11.2 3.2C11.84 2.424 12.28 1.36 12.16.28 11.24.32 10.12.9 9.44 1.66 8.84 2.34 8.3 3.42 8.44 4.46c1.02.08 2.06-.46 2.76-1.26z"/>
            </svg>
            Sign up with Apple
          </button>

          <button
            type="button"
            onClick={() => handleOAuthSignUp("google", setError)}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-(--radius-input) border border-border bg-white px-6 py-3 font-serif text-lg font-bold text-text-primary transition-opacity hover:opacity-88"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign up with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border-subtle" />
            <span className="text-sm text-text-muted">or</span>
            <div className="h-px flex-1 bg-border-subtle" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email address"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif text-lg outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
          />
          <div>
            <input
              type="password"
              placeholder="Password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif text-lg outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
            />
            {password && (
              <ul className="mt-2 space-y-0.5 text-sm">
                <Req met={reqs.length}>8+ characters</Req>
                <Req met={reqs.lower}>Lowercase letter</Req>
                <Req met={reqs.upper}>Uppercase letter</Req>
                <Req met={reqs.digit}>Number</Req>
                <Req met={reqs.symbol}>Symbol</Req>
              </ul>
            )}
          </div>
          <input
            type="password"
            placeholder="Confirm password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif text-lg outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
          />

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-(--radius-input) bg-accent px-6 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Req({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li className={met ? "text-green-600" : "text-text-muted"}>
      {met ? "\u2713" : "\u2022"} {children}
    </li>
  );
}
