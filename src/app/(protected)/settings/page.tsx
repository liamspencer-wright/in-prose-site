"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SettingsPage() {
  const { signOut } = useAuth();
  const supabase = createClient();

  const [showDeleteInfo, setShowDeleteInfo] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordMessage("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  }


  return (
    <div className="mx-auto w-full max-w-xl px-6 pt-4 pb-12 max-sm:px-4">
      <h1 className="mb-8 text-3xl font-bold">Settings</h1>

      {/* Profile link */}
      <Section title="Profile">
        <p className="mb-3 text-sm text-text-muted">
          Edit your display name, bio, avatar, and username.
        </p>
        <Link
          href="/settings/profile"
          className="inline-block rounded-(--radius-input) bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-88"
        >
          Edit profile
        </Link>
      </Section>

      {/* Password */}
      <Section title="Change password">
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
          />
          {passwordError && (
            <p className="text-sm text-error">{passwordError}</p>
          )}
          {passwordMessage && (
            <p className="text-sm text-green-600">{passwordMessage}</p>
          )}
          <button
            type="submit"
            disabled={changingPassword}
            className="cursor-pointer rounded-(--radius-input) bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
          >
            {changingPassword ? "Updating..." : "Update password"}
          </button>
        </form>
      </Section>

      {/* About */}
      <Section title="About">
        <div className="space-y-3">
          <div className="rounded-(--radius-card) bg-accent p-6 text-center">
            <p className="text-lg font-bold text-text-primary">Credits</p>
            <p className="mt-2 font-semibold text-text-primary">
              Created by Liam Wright
            </p>
            <p className="mt-1 text-sm text-text-primary opacity-80">
              Book details provided by ISBN DB.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/terms"
              className="flex-1 rounded-(--radius-input) border-[1.5px] border-border px-4 py-2.5 text-center text-sm font-semibold transition-colors hover:border-accent"
            >
              Terms of use
            </Link>
            <Link
              href="/privacy"
              className="flex-1 rounded-(--radius-input) border-[1.5px] border-border px-4 py-2.5 text-center text-sm font-semibold transition-colors hover:border-accent"
            >
              Privacy policy
            </Link>
          </div>
        </div>
      </Section>

      {/* Logout */}
      <Section title="Session">
        <button
          onClick={signOut}
          className="cursor-pointer rounded-(--radius-input) border-[1.5px] border-accent px-6 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
        >
          Log out
        </button>
      </Section>

      {/* Delete account */}
      <Section title="Danger zone">
        {showDeleteInfo ? (
          <div className="rounded-(--radius-card) border border-error/30 bg-error/5 p-4">
            <p className="mb-2 text-sm text-text-muted">
              To delete your account and all associated data, please email{" "}
              <a
                href="mailto:liam.inprose+datadeletionrequest@gmail.com"
                className="font-semibold text-accent hover:underline"
              >
                liam.inprose+datadeletionrequest@gmail.com
              </a>
              {" "}from the email address associated with your account.
            </p>
            <button
              onClick={() => setShowDeleteInfo(false)}
              className="cursor-pointer text-xs text-text-subtle hover:text-text-muted"
            >
              Close
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteInfo(true)}
            className="cursor-pointer text-sm text-text-subtle transition-colors hover:text-error"
          >
            Delete account
          </button>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 border-b border-border-subtle pb-8">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
