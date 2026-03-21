import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're on the list – In Prose",
};

export default function SignupSuccessPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-bg-medium p-8 text-center">
      <main>
        <h1 className="mb-2 text-[2.5rem] font-bold text-accent">
          You&apos;re on the list!
        </h1>
        <p className="text-xl">
          Thanks for signing up — we&apos;ll be in touch when beta access opens.
        </p>
        <p className="mt-6">
          <Link href="/" className="text-accent hover:underline">
            &larr; Back to in prose
          </Link>
        </p>
      </main>
    </div>
  );
}
