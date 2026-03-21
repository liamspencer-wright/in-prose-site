"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user!.id)
        .maybeSingle();

      if (data?.username) {
        router.replace(`/u/${data.username}`);
      } else {
        setFallback(true);
      }
    }

    load();
  }, [user, router]);

  if (fallback) {
    return (
      <div className="py-20 text-center text-text-muted">
        <p>Set up a username in the app to view your profile.</p>
      </div>
    );
  }

  return <p className="py-20 text-center text-text-muted">Loading...</p>;
}
