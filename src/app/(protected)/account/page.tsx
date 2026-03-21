"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

type Profile = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  description: string | null;
};

export default function AccountPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url, description")
        .eq("id", user!.id)
        .maybeSingle();

      setProfile(data as Profile | null);
      setLoading(false);
    }

    load();
  }, [user]);

  if (loading) {
    return <p className="py-20 text-center text-text-muted">Loading...</p>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 pt-8 pb-12 max-sm:px-4">
      <h1 className="mb-8 text-3xl font-bold">Account</h1>

      {/* Profile card */}
      <div className="mb-8 flex items-center gap-5 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-6">
        {profile?.avatar_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={profile.avatar_url}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-xl font-bold text-white">
            {(profile?.display_name ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-lg font-bold">
            {profile?.display_name ?? "No name set"}
          </p>
          {profile?.username && (
            <p className="text-text-muted">@{profile.username}</p>
          )}
          {profile?.description && (
            <p className="mt-1 text-sm text-text-subtle">
              {profile.description}
            </p>
          )}
        </div>
      </div>

      {/* Public profile link */}
      {profile?.username && (
        <div className="mb-6 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-4">
          <p className="mb-1 text-sm font-semibold">Your public profile</p>
          <Link
            href={`/u/${profile.username}`}
            className="text-accent hover:underline"
          >
            inprose.co.uk/@{profile.username}
          </Link>
        </div>
      )}

      {/* Account info */}
      <div className="space-y-3 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-6">
        <h2 className="text-lg font-bold">Details</h2>
        <MetaRow label="Email" value={user?.email ?? "—"} />
        <MetaRow
          label="Member since"
          value={
            user?.created_at
              ? new Date(user.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "—"
          }
        />
      </div>

      {/* Legal links */}
      <div className="mt-8 flex gap-6 text-sm text-text-subtle">
        <Link href="/privacy" className="hover:text-text-primary">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:text-text-primary">
          Terms of Use
        </Link>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border-subtle py-2">
      <span className="text-text-subtle">{label}</span>
      <span>{value}</span>
    </div>
  );
}
