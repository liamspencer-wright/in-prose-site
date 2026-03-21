"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "reserved" | "error";

export default function ProfileSetupPage() {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Auto-suggest username from display name
  useEffect(() => {
    if (usernameTouched) return;
    const suggested = displayName
      .toLowerCase()
      .replace(/ /g, ".")
      .replace(/[^a-z0-9.\-]/g, "")
      .slice(0, 30);
    if (suggested.length >= 3) {
      setUsername(suggested);
    }
  }, [displayName, usernameTouched]);

  // Check username availability (debounced)
  const checkUsername = useCallback(
    async (value: string) => {
      if (value.length < 3) {
        setUsernameStatus("idle");
        setUsernameMessage("");
        return;
      }

      setUsernameStatus("checking");
      setUsernameMessage("");

      try {
        const { data, error } = await supabase.rpc("check_username_available", {
          p_username: value,
        });

        if (error) {
          setUsernameStatus("error");
          setUsernameMessage("Couldn't check availability.");
          return;
        }

        const result = data as { available: boolean; reason?: string };
        if (result.available) {
          setUsernameStatus("available");
          setUsernameMessage(`@${value} is available`);
        } else {
          switch (result.reason) {
            case "invalid_format":
              setUsernameStatus("invalid");
              setUsernameMessage("3-30 chars, letters, numbers, dots and hyphens only.");
              break;
            case "reserved":
              setUsernameStatus("reserved");
              setUsernameMessage("This username is reserved.");
              break;
            default:
              setUsernameStatus("taken");
              setUsernameMessage(`@${value} is already taken.`);
          }
        }
      } catch {
        setUsernameStatus("error");
        setUsernameMessage("Couldn't check availability.");
      }
    },
    [supabase]
  );

  useEffect(() => {
    const timer = setTimeout(() => checkUsername(username), 500);
    return () => clearTimeout(timer);
  }, [username, checkUsername]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Display name is required.");
      return;
    }
    if (trimmedName.length > 30) {
      setError("Display name must be 30 characters or less.");
      return;
    }
    if (usernameStatus !== "available") {
      setError("Please choose an available username.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Not authenticated. Please log in again.");
        setLoading(false);
        return;
      }

      // Upsert profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: trimmedName,
      });

      if (profileError) {
        setError("Failed to save profile. Please try again.");
        setLoading(false);
        return;
      }

      // Set username via RPC
      const { error: usernameError } = await supabase.rpc("update_username", {
        p_username: username,
      });

      if (usernameError) {
        setError("Failed to set username. Please try again.");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  function handleUsernameChange(value: string) {
    setUsernameTouched(true);
    const cleaned = value
      .toLowerCase()
      .replace(/[^a-z0-9.\-]/g, "")
      .slice(0, 30);
    setUsername(cleaned);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <Image
        src="/logo.png"
        alt="in prose logo"
        width={120}
        height={120}
        className="mb-8 h-auto w-[120px]"
        priority
      />

      <div className="w-full max-w-sm rounded-(--radius-card) border border-border-subtle bg-bg-medium p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <h1 className="mb-2 text-center text-3xl font-bold">
          Set up your profile
        </h1>
        <p className="mb-6 text-center text-text-muted">
          Tell us a bit about yourself.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Display name */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-semibold">
                Display name <span className="text-accent">*</span>
              </label>
              <span
                className={`text-xs ${displayName.length > 30 ? "text-error" : "text-text-subtle"}`}
              >
                {displayName.length}/30
              </span>
            </div>
            <input
              type="text"
              placeholder="Enter your display name"
              autoComplete="name"
              value={displayName}
              onChange={(e) =>
                setDisplayName(e.target.value.slice(0, 30))
              }
              className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif text-lg outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
            />
          </div>

          {/* Username */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-semibold">
                Username <span className="text-accent">*</span>
              </label>
              {usernameStatus === "checking" && (
                <span className="text-xs text-text-subtle">Checking...</span>
              )}
              {usernameStatus === "available" && (
                <span className="text-xs text-green-600">&#10003;</span>
              )}
              {(usernameStatus === "taken" ||
                usernameStatus === "invalid" ||
                usernameStatus === "reserved" ||
                usernameStatus === "error") && (
                <span className="text-xs text-error">&#10007;</span>
              )}
            </div>
            <div
              className={`flex items-center rounded-(--radius-input) border-[1.5px] bg-bg-light transition-colors ${
                usernameStatus === "available"
                  ? "border-green-500"
                  : usernameStatus === "taken" ||
                      usernameStatus === "invalid" ||
                      usernameStatus === "reserved" ||
                      usernameStatus === "error"
                    ? "border-error"
                    : "border-border"
              } focus-within:border-accent`}
            >
              <span className="pl-4 text-lg text-text-muted">@</span>
              <input
                type="text"
                placeholder="your.username"
                autoComplete="username"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className="w-full bg-transparent px-2 py-3 font-serif text-lg outline-none placeholder:text-text-subtle"
              />
            </div>
            {usernameMessage && (
              <p
                className={`mt-1 text-xs ${usernameStatus === "available" ? "text-green-600" : "text-error"}`}
              >
                {usernameMessage}
              </p>
            )}
            {!usernameMessage && username.length < 3 && username.length > 0 && (
              <p className="mt-1 text-xs text-text-subtle">
                Username must be at least 3 characters.
              </p>
            )}
            {!usernameMessage && !username && (
              <p className="mt-1 text-xs text-text-subtle">
                Letters, numbers, dots, and hyphens only.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading || usernameStatus !== "available"}
            className="w-full cursor-pointer rounded-(--radius-input) bg-accent px-6 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
          >
            {loading ? "Saving..." : "Complete setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
