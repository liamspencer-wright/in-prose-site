"use client";

export default function OfflinePage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-4 text-3xl font-bold text-text-primary">
        You&apos;re offline
      </h1>
      <p className="mb-8 max-w-md text-lg text-text-muted">
        It looks like you&apos;ve lost your internet connection. Previously
        visited pages may still be available — try going back or check your
        connection.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-(--radius-input) bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Try again
      </button>
    </main>
  );
}
