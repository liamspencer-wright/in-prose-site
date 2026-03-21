import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in – In Prose",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-8 text-center">
      <h1 className="mb-2 text-4xl font-bold text-accent">Log in</h1>
      <p className="text-lg text-text-muted">Coming soon.</p>
    </div>
  );
}
