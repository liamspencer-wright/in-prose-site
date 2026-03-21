import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email confirmed – In Prose",
};

export default function ConfirmedPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-8 text-center">
      <main>
        <h1 className="mb-2 text-4xl font-bold text-accent">
          Email confirmed!
        </h1>
        <p className="text-xl">
          You&apos;re all set — thanks for verifying your email.
        </p>
        <p className="mt-4">
          <Link href="/" className="text-accent hover:underline">
            Return to In Prose
          </Link>
        </p>
      </main>
    </div>
  );
}
