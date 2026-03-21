import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 max-sm:px-4">
      <Link href="/" className="mb-8 inline-block">
        <Image
          src="/logo.png"
          alt="in prose logo"
          width={80}
          height={80}
          className="h-auto w-[80px]"
        />
      </Link>

      <h1 className="mb-2 text-4xl font-bold">Privacy Policy</h1>
      <p className="mb-8 text-sm text-text-subtle">
        Last updated: November 30, 2025
      </p>

      <div className="space-y-6 leading-relaxed text-text-muted [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-text-primary">
        <p>
          This policy explains how In Prose handles your data during this early
          testing phase.
        </p>

        <h2>1. What data we collect</h2>
        <p>We store the information you provide, including:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Account information (email, display name)</li>
          <li>Books you add to your library</li>
          <li>Status, ratings, reviews</li>
          <li>Activity (e.g., started/finished/reviewed)</li>
          <li>Friends list connections</li>
          <li>Timestamps of interactions</li>
        </ul>

        <h2>2. Where your data is stored</h2>
        <p>
          All data is stored securely in Supabase Postgres, hosted by Supabase.
          Supabase also manages authentication and session tokens.
        </p>

        <h2>3. Why we store this data</h2>
        <p>We store this data to provide the app&apos;s core features:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Tracking your reading</li>
          <li>Syncing your library</li>
          <li>Showing your activity feed</li>
          <li>Social features (friends &amp; shared books)</li>
        </ul>
        <p>
          We do not sell or share your information with third parties.
        </p>

        <h2>4. Who can access your data</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Only you</li>
          <li>
            Users you explicitly connect with (for specific features)
          </li>
          <li>
            The developer (for debugging, app maintenance, and deletion
            requests)
          </li>
        </ul>

        <h2>5. How long we keep data</h2>
        <p>We retain your data until:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>You request deletion, or</li>
          <li>The beta ends and the app is shut down</li>
        </ul>

        <h2>6. Your rights</h2>
        <p>You may request:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>A copy of your data</li>
          <li>Correction of incorrect data</li>
          <li>Complete deletion of your account &amp; all stored information</li>
        </ul>
        <p>
          To make a request, email{" "}
          <a
            href="mailto:liam.inprose+ddrequest@gmail.com"
            className="text-accent hover:underline"
          >
            liam.inprose+ddrequest@gmail.com
          </a>
          .
        </p>

        <h2>7. Security</h2>
        <p>
          Supabase provides encryption, row-level security, and authenticated
          access. While every effort is made to secure your data, no system is
          100% secure.
        </p>
      </div>

      <p className="mt-12 text-sm text-text-subtle">
        <Link href="/" className="text-accent hover:underline">
          &larr; Back to In Prose
        </Link>
      </p>
    </div>
  );
}
