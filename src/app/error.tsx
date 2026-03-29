"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-8 text-center">
      <h1 className="mb-2 text-4xl font-bold">Something went wrong</h1>
      <p className="mb-6 text-lg text-text-muted">
        An unexpected error occurred. Please try again.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="cursor-pointer rounded-(--radius-input) bg-accent px-6 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-(--radius-input) border-[1.5px] border-border px-6 py-3 font-serif text-lg font-semibold transition-colors hover:border-accent"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
