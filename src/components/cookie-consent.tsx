"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const CONSENT_KEY = "cookie-consent";

export type ConsentState = "accepted" | "rejected" | null;

export function getConsentState(): ConsentState {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === "accepted" || value === "rejected") return value;
  return null;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getConsentState()) {
      setVisible(true);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  function handleReject() {
    localStorage.setItem(CONSENT_KEY, "rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 border-t border-border bg-bg-medium px-6 py-4 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-primary">
          We use cookies to improve your experience.{" "}
          <Link href="/privacy" className="text-accent underline hover:opacity-80">
            Privacy policy
          </Link>
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleReject}
            className="cursor-pointer rounded-(--radius-input) border-[1.5px] border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-accent"
          >
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="cursor-pointer rounded-(--radius-input) bg-accent px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-88"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
