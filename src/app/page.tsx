import Image from "next/image";
import Script from "next/script";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function HomePage() {
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />

      <div className="flex min-h-svh flex-col">
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-4 max-sm:px-4">
          <Image
            src="/logo.png"
            alt="in prose logo"
            width={100}
            height={100}
            className="h-auto w-[100px] max-sm:w-[80px]"
            priority
          />
          <Link
            href="/login"
            className="rounded-(--radius-input) border-[1.5px] border-accent px-5 py-2 font-serif text-base font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
          >
            Log in
          </Link>
        </nav>

        {/* Hero */}
        <section className="flex flex-col items-center px-4 pt-12 pb-16 text-center max-sm:pt-8 max-sm:pb-12">
          <div className="flex w-full max-w-[520px] flex-col items-center justify-center rounded-(--radius-card) bg-accent p-12 shadow-[0_4px_16px_rgba(255,127,50,0.25)] max-sm:rounded-xl max-sm:p-8">
            <h1 className="text-6xl font-bold lowercase text-black max-sm:text-4xl">
              in prose
            </h1>
            <p className="mt-1 text-3xl text-black max-sm:text-xl">
              Books and data — perfectly bound.
            </p>
          </div>
          <p className="mt-8 max-w-md text-xl leading-relaxed text-text-muted max-sm:text-lg">
            Track what you read. See how your friends read. Discover your next
            favourite book.
          </p>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-3xl px-6 pb-16 max-sm:px-4">
          <div className="grid gap-6 sm:grid-cols-3">
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" className="h-8 w-8 fill-accent">
                  <path d="M21 4H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zM4 18V6h7v12H4zm9 0V6h7v12h-7z" />
                </svg>
              }
              title="Your library"
              description="Scan barcodes to add books instantly. Track what you're reading, what you've finished, and what's next."
            />
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" className="h-8 w-8 fill-accent">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
              }
              title="Read with friends"
              description="Connect with friends, see what they're reading, and discover books in common."
            />
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" className="h-8 w-8 fill-accent">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                </svg>
              }
              title="Reading stats"
              description="Set reading targets, track your pace, and see your reading habits over time."
            />
          </div>
        </section>

        {/* Beta signup */}
        <section className="flex flex-col items-center px-4 pb-16">
          <div className="w-full max-w-[480px] rounded-(--radius-card) border border-border-subtle bg-bg-medium p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.06)] max-sm:p-5">
            <h2 className="mb-2 text-2xl font-bold">Join the beta</h2>
            <p className="mb-6 text-lg text-text-muted">
              In Prose is in early beta. Sign up to get access.
            </p>
            <SignupForm />
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto border-t border-border px-6 py-8 max-sm:px-4">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
            <div className="flex items-center gap-5">
              <SocialLink
                href="https://www.linkedin.com/in/liam-spencer-wright"
                label="LinkedIn"
                icon="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
              />
              <SocialLink
                href="https://www.instagram.com/inprose.app/"
                label="Instagram"
                icon="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
              />
              <SocialLink
                href="https://www.tiktok.com/@in.prose"
                label="TikTok"
                icon="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
              />
            </div>
            <div className="flex gap-6 text-sm text-text-subtle">
              <Link href="/privacy" className="hover:text-text-primary">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-text-primary">
                Terms of Use
              </Link>
            </div>
            <p className="text-xs text-text-subtle">
              &copy; {new Date().getFullYear()} In Prose. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-(--radius-card) border border-border-subtle bg-bg-medium p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <div className="mb-3">{icon}</div>
      <h3 className="mb-2 text-lg font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-text-muted">{description}</p>
    </div>
  );
}

function SocialLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={label}
      className="opacity-50 transition-opacity hover:opacity-100"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 fill-current text-text-primary"
      >
        <path d={icon} />
      </svg>
    </a>
  );
}
