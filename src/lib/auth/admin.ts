import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Server-only admin gate for `/admin/**` routes.
 *
 * - Unauthenticated → redirect to `/login` (login is public, no admin-surface
 *   information disclosed).
 * - Authenticated but not `profiles.is_admin = true` → `notFound()` so the
 *   admin surface returns a 404 to non-admins. We do not redirect to `/`
 *   because that signals the URL exists.
 *
 * Returns the supabase client + user for callers that need to issue further
 * queries (saves the layout from re-creating the client).
 */
export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) notFound();

  return { supabase, user };
}
