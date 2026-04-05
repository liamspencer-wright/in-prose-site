"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

function passwordMeetsRequirements(pwd: string) {
  return {
    length: pwd.length >= 8,
    lower: /[a-z]/.test(pwd),
    upper: /[A-Z]/.test(pwd),
    digit: /[0-9]/.test(pwd),
    symbol: /[^A-Za-z0-9]/.test(pwd),
  };
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const reqs = passwordMeetsRequirements(password);
  const allMet =
    reqs.length && reqs.lower && reqs.upper && reqs.digit && reqs.symbol;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

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
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/");
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
        <h1 className="mb-2 text-center text-3xl font-bold">
          Set new password
        </h1>
        <p className="mb-6 text-center text-sm text-text-muted">
          Choose a new password for your account.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              type="password"
              placeholder="New password"
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
            placeholder="Confirm new password"
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
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
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
