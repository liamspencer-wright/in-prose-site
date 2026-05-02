import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-8">
      <h1 className="mb-2 text-4xl font-bold">Page not found</h1>
      <p className="text-lg">
        Try the{" "}
        <Link href="/" className="text-accent hover:underline">
          homepage
        </Link>
        .
      </p>
    </div>
  );
}
