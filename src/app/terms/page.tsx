import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Terms of Use",
};

export default function TermsPage() {
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

      <h1 className="mb-2 text-4xl font-bold">Terms of Use</h1>
      <p className="mb-8 text-sm text-text-subtle">
        Last updated: November 30, 2025
      </p>

      <div className="space-y-6 leading-relaxed text-text-muted [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-text-primary">
        <h2>1. Beta disclaimer</h2>
        <p>
          In Prose is currently in beta. Features may change, break, or be
          removed without notice. Data may be reset during the beta period.
        </p>

        <h2>2. No warranty</h2>
        <p>
          The app is provided &ldquo;as is&rdquo; without warranty of any kind.
          We do not guarantee uptime, data retention, or feature availability
          during the beta.
        </p>

        <h2>3. User content</h2>
        <p>
          You retain ownership of any content you create (reviews, ratings,
          etc.). By using the app, you grant In Prose a licence to display your
          content within the app to other users as part of social features.
        </p>

        <h2>4. Account removal</h2>
        <p>
          We reserve the right to remove accounts that violate these terms or
          engage in abusive behaviour. You may request account deletion at any
          time.
        </p>

        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Use the app for any unlawful purpose</li>
          <li>Attempt to access other users&apos; data without permission</li>
          <li>Upload harmful, offensive, or inappropriate content</li>
          <li>Interfere with or disrupt the service</li>
        </ul>

        <h2>6. Changes to terms</h2>
        <p>
          We may update these terms at any time. Continued use of the app after
          changes constitutes acceptance of the new terms.
        </p>

        <h2>7. End User License Agreement</h2>
        <p>
          In Prose grants you a limited, non-exclusive, non-transferable licence
          to use the app for personal, non-commercial purposes. You may not
          reverse-engineer, decompile, or redistribute the app. This licence
          terminates when you delete your account or the beta period ends.
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
