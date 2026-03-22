"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import Link from "next/link";

type UsernameStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid"
  | "reserved"
  | "error"
  | "current";

export default function EditProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);


  // Username
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [usernameUpdatedAt, setUsernameUpdatedAt] = useState<string | null>(
    null
  );

  // Load current profile
  useEffect(() => {
    if (!user) return;

    async function load() {
      const { data } = await supabase
        .from("profiles")
        .select(
          "display_name, description, phone_number, avatar_url, username, username_updated_at"
        )
        .eq("id", user!.id)
        .maybeSingle();

      if (data) {
        setDisplayName(data.display_name ?? "");
        setBio(data.description ?? "");
        setPhoneNumber(data.phone_number ?? "");
        setAvatarUrl(data.avatar_url);
        setUsername(data.username ?? "");
        setOriginalUsername(data.username ?? "");
        setUsernameUpdatedAt(data.username_updated_at);
        setUsernameStatus(data.username ? "current" : "idle");
      }
      setLoading(false);
    }

    load();
  }, [user, supabase]);

  // Check username availability (debounced)
  const checkUsername = useCallback(
    async (value: string) => {
      if (value === originalUsername) {
        setUsernameStatus("current");
        setUsernameMessage("");
        return;
      }
      if (value.length < 3) {
        setUsernameStatus("idle");
        setUsernameMessage("");
        return;
      }

      setUsernameStatus("checking");
      setUsernameMessage("");

      try {
        const { data, error } = await supabase.rpc(
          "check_username_available",
          { p_username: value }
        );

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
              setUsernameMessage(
                "3-30 chars, letters, numbers, dots and hyphens only."
              );
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
    [supabase, originalUsername]
  );

  useEffect(() => {
    if (username === originalUsername) return;
    const timer = setTimeout(() => checkUsername(username), 500);
    return () => clearTimeout(timer);
  }, [username, checkUsername, originalUsername]);

  function handleUsernameChange(value: string) {
    const cleaned = value
      .toLowerCase()
      .replace(/[^a-z0-9.\-]/g, "")
      .slice(0, 30);
    setUsername(cleaned);
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setRemoveAvatar(false);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  }

  function handleRemoveAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");
    setSaving(true);
    setSaved(false);

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Display name is required.");
      setSaving(false);
      return;
    }

    // Upload avatar if changed
    let newAvatarUrl = avatarUrl;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, {
          contentType: avatarFile.type,
          upsert: true,
        });

      if (uploadError) {
        setError("Failed to upload avatar.");
        setSaving(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      newAvatarUrl = publicUrl;
    } else if (removeAvatar) {
      newAvatarUrl = null;
    }

    // Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: trimmedName,
        description: bio.trim() || null,
        phone_number: phoneNumber.trim() || null,
        avatar_url: newAvatarUrl,
      })
      .eq("id", user.id);

    if (profileError) {
      setError("Failed to update profile.");
      setSaving(false);
      return;
    }

    // Update username if changed
    if (username !== originalUsername && username.length >= 3) {
      if (
        usernameStatus !== "available" &&
        usernameStatus !== "current"
      ) {
        setError("Please choose an available username.");
        setSaving(false);
        return;
      }

      const { data, error: usernameError } = await supabase.rpc(
        "update_username",
        { p_username: username }
      );

      if (usernameError) {
        setError("Failed to update username.");
        setSaving(false);
        return;
      }

      const result = data as { success: boolean; error?: string } | null;
      if (result && !result.success) {
        setError(result.error ?? "Failed to update username.");
        setSaving(false);
        return;
      }

      setOriginalUsername(username);
      setUsernameStatus("current");
    }

    setAvatarUrl(newAvatarUrl);
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(false);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  // Cooldown display
  const cooldownInfo = usernameUpdatedAt
    ? getCooldownInfo(usernameUpdatedAt)
    : null;

  if (loading) {
    return (
      <p className="py-20 text-center text-text-muted">Loading profile...</p>
    );
  }

  const displayedAvatar = avatarPreview ?? (removeAvatar ? null : avatarUrl);

  return (
    <div className="mx-auto w-full max-w-xl px-6 pt-4 pb-12 max-sm:px-4">
      <Link
        href="/settings"
        className="mb-4 inline-block text-sm text-accent hover:underline"
      >
        &larr; Back to settings
      </Link>

      <h1 className="mb-8 text-3xl font-bold">Edit profile</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar */}
        <div>
          <label className="mb-2 block text-sm font-semibold">Avatar</label>
          <div className="flex items-center gap-4">
            {displayedAvatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={displayedAvatar}
                alt=""
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white">
                {(displayName || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-(--radius-input) border-[1.5px] border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-accent"
              >
                Change avatar
              </button>
              {displayedAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="cursor-pointer text-xs text-text-subtle transition-colors hover:text-error"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />
          </div>
        </div>

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
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 30))}
            placeholder="Your display name"
            className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif text-lg outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
          />
        </div>

        {/* Username */}
        {/* (placed after display name, matching iOS app order) */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-semibold">Username</label>
            {usernameStatus === "checking" && (
              <span className="text-xs text-text-subtle">Checking...</span>
            )}
            {usernameStatus === "available" && (
              <span className="text-xs text-green-600">&#10003; Available</span>
            )}
            {usernameStatus === "current" && (
              <span className="text-xs text-text-subtle">Current</span>
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
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="your.username"
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
          {cooldownInfo && !cooldownInfo.canChange && (
            <p className="mt-1 text-xs text-text-subtle">
              Username can be changed again {cooldownInfo.availableDate}.
            </p>
          )}
        </div>

        {/* Phone number */}
        <div>
          <label className="mb-1 block text-sm font-semibold">
            Phone number
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Enter your phone number"
            className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif text-lg outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
          />
        </div>

        {/* About you */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-semibold">About you</label>
            <span
              className={`text-xs ${bio.length > 160 ? "text-error" : "text-text-subtle"}`}
            >
              {bio.length}/160
            </span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            placeholder="What kind of books do you read? Tell us about yourself..."
            rows={3}
            className="w-full resize-none rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
          />
        </div>

        {/* Error / Save */}
        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="cursor-pointer rounded-(--radius-input) bg-accent px-8 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

function getCooldownInfo(updatedAt: string): {
  canChange: boolean;
  availableDate: string;
} {
  const updated = new Date(updatedAt);
  const cooldownEnd = new Date(updated.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();

  if (now >= cooldownEnd) {
    return { canChange: true, availableDate: "" };
  }

  return {
    canChange: false,
    availableDate: cooldownEnd.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
}
