"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackError = searchParams.get("error");
  const nextPath = searchParams.get("next");
  const contextMessage = searchParams.get("message");

  async function handleAppleSignIn() {
    setError("");
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
    }
  }

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

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    // Redirect to the original page, or home. Only allow relative paths.
    const destination =
      nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : "/";
    router.push(destination);
    router.refresh();
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
        <h1 className="mb-6 text-center text-3xl font-bold">Log in</h1>

        {contextMessage && (
          <p className="mb-4 rounded-(--radius-input) bg-accent/10 p-3 text-center text-sm text-text-muted">
            {contextMessage}
          </p>
        )}

        {callbackError && (
          <p className="mb-4 rounded-(--radius-input) bg-error/10 p-3 text-sm text-error">
            {callbackError === "auth_callback_failed"
              ? "Email confirmation failed. Please try again."
              : "Something went wrong. Please try again."}
          </p>
        )}

        <div className="mb-4 flex flex-col gap-4">
          <button
            type="button"
            onClick={handleAppleSignIn}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-(--radius-input) bg-black px-6 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88"
          >
            <svg className="h-5 w-5" viewBox="0 0 17 20" fill="currentColor">
              <path d="M13.545 10.239c-.022-2.234 1.823-3.306 1.906-3.358-.037-.054-1.494-1.422-1.906-1.76-.404-.331-1.218-.78-2.04-.78-.868 0-1.626.519-2.052.519-.433 0-1.09-.505-1.793-.491-.923.014-1.774.537-2.249 1.364-1.585 2.747-.405 6.816 1.139 9.046.754 1.091 1.655 2.316 2.838 2.272 1.139-.046 1.568-.737 2.945-.737 1.37 0 1.764.737 2.945.714 1.225-.019 2.002-1.112 2.748-2.208.866-1.266 1.224-2.491 1.245-2.554-.027-.012-2.388-.916-2.412-3.636l-.014-.191zM11.2 3.2C11.84 2.424 12.28 1.36 12.16.28 11.24.32 10.12.9 9.44 1.66 8.84 2.34 8.3 3.42 8.44 4.46c1.02.08 2.06-.46 2.76-1.26z"/>
            </svg>
            Sign in with Apple
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
          <input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif text-lg outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
          />

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-(--radius-input) bg-accent px-6 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
          >
            {loading ? "Signing in..." : "Log in"}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <Link
            href="/forgot-password"
            className="text-accent hover:underline"
          >
            Forgot password?
          </Link>
          <p className="text-text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-accent hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
