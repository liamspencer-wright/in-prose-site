import { createClient } from "@/lib/supabase/server";

export type PublicProfile = {
  id: string;
  display_name: string | null;
  username: string;
  avatar_url: string | null;
  badge_type: string | null;
  description: string | null;
  joined_at: string | null;
  public_review_count: number;
  public_book_count: number;
  public_finished_count: number;
  public_stack_count: number;
};

/**
 * Public-safe profile lookup with aggregated counts. Used by every
 * /u/[username]/* route. Returns null if the username doesn't resolve.
 */
export async function fetchPublicProfile(
  username: string
): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_public_profile_by_username", { p_username: username })
    .maybeSingle();
  if (error || !data) return null;
  const row = data as PublicProfile;
  return {
    ...row,
    public_review_count: Number(row.public_review_count ?? 0),
    public_book_count: Number(row.public_book_count ?? 0),
    public_finished_count: Number(row.public_finished_count ?? 0),
    public_stack_count: Number(row.public_stack_count ?? 0),
  };
}

/**
 * Indexability rule for profile pages: the main /u/[username] page indexes
 * if there's any public content (≥1 review OR ≥1 stack OR ≥1 public book);
 * sub-routes index only when their specific data exists in volume.
 */
export function isProfileIndexable(p: PublicProfile): boolean {
  return (
    p.public_review_count >= 5 ||
    p.public_stack_count >= 1
  );
}
