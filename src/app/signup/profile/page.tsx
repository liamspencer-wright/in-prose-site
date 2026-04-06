"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import UserAvatar from "@/components/user-avatar";

type UsernameStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid"
  | "reserved"
  | "error";

export default function ProfileSetupPage() {
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);

  // Step 2 fields
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
    [supabase]
  );

  useEffect(() => {
    const timer = setTimeout(() => checkUsername(username), 500);
    return () => clearTimeout(timer);
  }, [username, checkUsername]);

  function handleUsernameChange(value: string) {
    setUsernameTouched(true);
    const cleaned = value
      .toLowerCase()
      .replace(/[^a-z0-9.\-]/g, "")
      .slice(0, 30);
    setUsername(cleaned);
  }

  // Step 1 → Step 2: save display name + username first (edge case: user abandons step 2)
  async function handleStep1Submit(e: React.FormEvent) {
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

      // Save Step 1 data so the user isn't stuck if they abandon Step 2
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: trimmedName,
      });

      if (profileError) {
        setError("Failed to save profile. Please try again.");
        setLoading(false);
        return;
      }

      const { error: usernameError } = await supabase.rpc("update_username", {
        p_username: username,
      });

      if (usernameError) {
        setError("Failed to set username. Please try again.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setStep(2);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // Avatar selection
  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB.");
      return;
    }

    setError("");
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  }

  function handleRemoveAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Compress and resize avatar before upload
  async function compressAvatar(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 512;
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height / width) * maxSize);
            width = maxSize;
          } else {
            width = Math.round((width / height) * maxSize);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to compress image"));
          },
          "image/jpeg",
          0.9
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  }

  // Phone number validation
  function isPhoneValid(phone: string): boolean {
    if (!phone.trim()) return true; // optional
    return /^\+?[0-9]{7,15}$/.test(phone.trim());
  }

  // Step 2 submit: upload avatar, save phone + bio
  async function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validate phone number
    if (phoneNumber.trim() && !isPhoneValid(phoneNumber)) {
      setError("Please enter a valid phone number (7-15 digits, optional + prefix).");
      return;
    }

    // Validate bio length
    if (bio.length > 250) {
      setError("Bio must be 250 characters or less.");
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

      let avatarUrl: string | null = null;

      // Upload avatar if selected
      if (avatarFile) {
        setUploadProgress(true);

        const compressed = await compressAvatar(avatarFile);
        const path = `${user.id}/avatar_${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, compressed, {
            contentType: "image/jpeg",
            upsert: true,
          });

        setUploadProgress(false);

        if (uploadError) {
          setError("Failed to upload avatar. Please try again.");
          setLoading(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = publicUrl;
      }

      // Update profile with Step 2 fields
      const updateData: Record<string, string | null> = {};
      if (avatarUrl) updateData.avatar_url = avatarUrl;
      if (phoneNumber.trim()) updateData.phone_number = phoneNumber.trim();
      if (bio.trim()) updateData.description = bio.trim();

      if (Object.keys(updateData).length > 0) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", user.id);

        if (profileError) {
          setError("Failed to save profile. Please try again.");
          setLoading(false);
          return;
        }
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // Skip Step 2 entirely
  function handleSkip() {
    router.push("/");
    router.refresh();
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

      {/* Progress indicator */}
      <div className="mb-6 flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            step >= 1 ? "bg-accent text-white" : "bg-border text-text-muted"
          }`}
        >
          {step > 1 ? "✓" : "1"}
        </div>
        <div
          className={`h-0.5 w-12 ${step >= 2 ? "bg-accent" : "bg-border"}`}
        />
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            step >= 2 ? "bg-accent text-white" : "bg-border text-text-muted"
          }`}
        >
          2
        </div>
      </div>

      <div className="w-full max-w-sm rounded-(--radius-card) border border-border-subtle bg-bg-medium p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] max-sm:p-5">
        {step === 1 ? (
          <>
            <h1 className="mb-2 text-center text-3xl font-bold">
              Set up your profile
            </h1>
            <p className="mb-6 text-center text-text-muted">
              Choose your name and username.
            </p>

            <form onSubmit={handleStep1Submit} className="flex flex-col gap-5">
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
                    <span className="text-xs text-text-subtle">
                      Checking...
                    </span>
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
                {!usernameMessage &&
                  username.length < 3 &&
                  username.length > 0 && (
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
                {loading ? "Saving..." : "Next"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-center text-3xl font-bold">
              Personalise your profile
            </h1>
            <p className="mb-6 text-center text-text-muted">
              Add a photo and tell us about yourself.
            </p>

            <form onSubmit={handleStep2Submit} className="flex flex-col gap-5">
              {/* Avatar */}
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Profile photo
                </label>
                <div className="flex items-center gap-4">
                  <UserAvatar
                    url={avatarPreview}
                    name={displayName || null}
                    size={80}
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer rounded-(--radius-input) border-[1.5px] border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-accent"
                    >
                      {avatarPreview ? "Change photo" : "Upload photo"}
                    </button>
                    {avatarPreview && (
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
                    accept="image/jpeg,image/png"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                </div>
                <p className="mt-2 text-xs text-text-subtle">
                  JPEG or PNG, max 5MB.
                </p>
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
                  placeholder="+44 7700 000000"
                  className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif text-lg outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
                />
                <p className="mt-1 text-xs text-text-subtle">
                  Optional. 7-15 digits with optional + prefix.
                </p>
              </div>

              {/* Bio / description */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-semibold">About you</label>
                  <span
                    className={`text-xs ${bio.length > 250 ? "text-error" : "text-text-subtle"}`}
                  >
                    {bio.length}/250
                  </span>
                </div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 250))}
                  placeholder="What kind of books do you read? Tell us about yourself..."
                  rows={3}
                  className="w-full resize-none rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
                />
              </div>

              {error && <p className="text-sm text-error">{error}</p>}

              {uploadProgress && (
                <p className="text-center text-sm text-text-muted">
                  Uploading photo...
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full cursor-pointer rounded-(--radius-input) bg-accent px-6 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
              >
                {loading ? "Saving..." : "Complete setup"}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="w-full cursor-pointer text-sm text-text-muted transition-colors hover:text-text-primary"
              >
                Skip for now
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
