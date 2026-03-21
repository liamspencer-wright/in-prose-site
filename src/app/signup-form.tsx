"use client";

import { useState, useRef, FormEvent } from "react";

declare global {
  interface Window {
    turnstile?: {
      getResponse: () => string | null;
      reset: () => void;
    };
  }
}

export function SignupForm() {
  const [state, setState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim();

    if (!name || !email) {
      setErrorMessage("Please fill in your name and email.");
      setState("error");
      return;
    }

    const token = window.turnstile?.getResponse() ?? null;
    if (!token) {
      setErrorMessage("Please complete the verification above.");
      setState("error");
      return;
    }

    setState("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/.netlify/functions/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, token }),
      });

      if (res.ok) {
        setState("success");
      } else if (res.status === 409) {
        setErrorMessage("That email is already signed up!");
        setState("error");
        window.turnstile?.reset();
      } else {
        setErrorMessage("Something went wrong — please try again.");
        setState("error");
        window.turnstile?.reset();
      }
    } catch {
      setErrorMessage("Something went wrong — please try again.");
      setState("error");
      window.turnstile?.reset();
    }
  }

  if (state === "success") {
    return (
      <p className="py-2 text-lg leading-relaxed">
        You&apos;re on the list! We&apos;ll be in touch when beta access opens.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col items-center gap-3"
    >
      <input
        type="text"
        name="name"
        placeholder="Your name"
        autoComplete="name"
        required
        className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif text-lg text-text-primary outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
      />
      <input
        type="email"
        name="email"
        placeholder="Email address"
        autoComplete="email"
        required
        className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif text-lg text-text-primary outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
      />
      <div
        className="cf-turnstile my-1"
        data-sitekey="0x4AAAAAACtZB8AYCwk2wgLB"
        data-theme="light"
      />
      {errorMessage && (
        <p className="min-h-6 py-1 text-base text-error">{errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={state === "submitting"}
        className="w-full cursor-pointer rounded-(--radius-input) bg-accent px-6 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
      >
        {state === "submitting" ? "Sending..." : "Request beta access"}
      </button>
    </form>
  );
}
