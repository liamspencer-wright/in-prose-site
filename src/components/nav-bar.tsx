"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "./auth-provider";

export function NavBar() {
  const { user, loading, signOut } = useAuth();

  return (
    <nav className="flex items-center justify-between px-6 py-4 max-sm:px-4">
      <Link href="/">
        <Image
          src="/logo.png"
          alt="in prose logo"
          width={100}
          height={100}
          className="h-auto w-[100px] max-sm:w-[80px]"
          priority
        />
      </Link>

      {loading ? (
        <div className="h-10 w-20" />
      ) : user ? (
        <div className="flex items-center gap-4">
          <UserInfo userId={user.id} />
          <button
            onClick={signOut}
            className="cursor-pointer rounded-(--radius-input) border-[1.5px] border-accent px-5 py-2 font-serif text-base font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
          >
            Log out
          </button>
        </div>
      ) : (
        <Link
          href="/login"
          className="rounded-(--radius-input) border-[1.5px] border-accent px-5 py-2 font-serif text-base font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
        >
          Log in
        </Link>
      )}
    </nav>
  );
}

function UserInfo({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<{
    display_name: string | null;
    username: string | null;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", userId)
        .maybeSingle();
      if (data) setProfile(data);
    }
    load();
  }, [userId]);

  if (!profile) return null;

  return (
    <div className="text-right text-sm max-sm:hidden">
      {profile.display_name && (
        <p className="font-semibold leading-tight">{profile.display_name}</p>
      )}
      {profile.username && (
        <p className="leading-tight text-text-muted">@{profile.username}</p>
      )}
    </div>
  );
}
