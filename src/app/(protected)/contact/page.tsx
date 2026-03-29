"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import Script from "next/script";
import { useAuth } from "@/components/auth-provider";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          theme?: string;
          callback?: (token: string) => void;
        }
      ) => string;
      getResponse: (widgetId?: string) => string | null;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const CATEGORIES = ["Bug report", "Feedback", "Support"] as const;

export default function ContactPage() {
  const { user } = useAuth();
  const [state, setState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    function renderWidget() {
      if (!turnstileRef.current || widgetIdRef.current) return;
      if (!window.turnstile) return;

      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: "0x4AAAAAACtZB8AYCwk2wgLB",
        theme: "light",
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const category = formData.get("category") as string;
    const subject = (formData.get("subject") as string)?.trim();
    const message = (formData.get("message") as string)?.trim();

    if (!category || !subject || !message) {
      setErrorMessage("Please fill in all fields.");
      setState("error");
      return;
    }

    const token =
      window.turnstile?.getResponse(widgetIdRef.current ?? undefined) ?? null;
    if (!token) {
      setErrorMessage("Please complete the verification.");
      setState("error");
      return;
    }

    setState("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/.netlify/functions/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subject,
          message,
          email: user?.email,
          userId: user?.id,
          token,
        }),
      });

      if (res.ok) {
        setState("success");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(
          data.error === "rate_limited"
            ? "You've sent too many messages recently. Please try again later."
            : "Something went wrong — please try again."
        );
        setState("error");
        window.turnstile?.reset(widgetIdRef.current ?? undefined);
      }
    } catch {
      setErrorMessage("Something went wrong — please try again.");
      setState("error");
      window.turnstile?.reset(widgetIdRef.current ?? undefined);
    }
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
      />

      <div className="mx-auto max-w-lg px-6 py-12 max-sm:px-4">
        <h1 className="mb-2 text-3xl font-bold">Contact us</h1>
        <p className="mb-8 text-lg text-text-muted">
          Bug report, feedback, or need help? We&apos;d love to hear from you.
        </p>

        {state === "success" ? (
          <div className="rounded-(--radius-card) border border-border-subtle bg-bg-medium p-8 text-center">
            <p className="text-lg">
              Thanks for getting in touch! We&apos;ll get back to you as soon as
              we can.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            <div>
              <label
                htmlFor="category"
                className="mb-1 block text-sm font-semibold"
              >
                Category
              </label>
              <select
                id="category"
                name="category"
                required
                defaultValue=""
                className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif text-lg text-text-primary outline-none transition-colors focus:border-accent"
              >
                <option value="" disabled>
                  Select a category...
                </option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="subject"
                className="mb-1 block text-sm font-semibold"
              >
                Subject
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                placeholder="Brief description"
                required
                className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif text-lg text-text-primary outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="mb-1 block text-sm font-semibold"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                placeholder="Tell us more..."
                rows={5}
                required
                className="w-full resize-y rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif text-lg text-text-primary outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
              />
            </div>

            <div ref={turnstileRef} className="my-1" />

            {errorMessage && (
              <p className="text-base text-error">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={state === "submitting"}
              className="w-full cursor-pointer rounded-(--radius-input) bg-accent px-6 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
            >
              {state === "submitting" ? "Sending..." : "Send message"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
