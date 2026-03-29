"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { useParams } from "next/navigation";
import Link from "next/link";

type Profile = {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
};

type BookInCommon = {
  isbn13: string;
  title: string;
  cover_url: string | null;
  my_status: string | null;
  friend_status: string | null;
};

type FriendBook = {
  isbn13: string;
  title: string;
  cover_url: string | null;
  status: string | null;
  rating: number | null;
  first_author_name: string | null;
};

type Favourite = {
  isbn13: string;
  rank: number;
  title: string;
  cover_url: string | null;
};

export default function FriendProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const friendId = params.friendId as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [booksInCommon, setBooksInCommon] = useState<BookInCommon[]>([]);
  const [friendBooks, setFriendBooks] = useState<FriendBook[]>([]);
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !friendId) return;
    const currentUserId = user.id;

    async function load() {
      const supabase = createClient();

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, bio")
        .eq("id", friendId)
        .maybeSingle();

      setProfile(profileData as Profile | null);

      // Check friendship
      const { data: friendship } = await supabase
        .rpc("are_friends", {
          user_id_1: currentUserId,
          user_id_2: friendId,
        });

      const areFriends = !!friendship;
      setIsFriend(areFriends);

      if (areFriends) {
        // Books in common
        const { data: common } = await supabase.rpc("get_books_in_common", {
          user_id_1: currentUserId,
          user_id_2: friendId,
        });
        setBooksInCommon((common as BookInCommon[]) ?? []);

        // Friend's visible library
        const { data: library } = await supabase
          .from("user_books_expanded_all")
          .select("isbn13, title, cover_url, status, rating, first_author_name")
          .eq("user_id", friendId)
          .in("visibility", ["public", "friends_only"])
          .order("created_at", { ascending: false })
          .limit(20);

        setFriendBooks((library as FriendBook[]) ?? []);

        // Favourites
        const { data: favs } = await supabase
          .from("user_favourites")
          .select("isbn13, rank")
          .eq("user_id", friendId)
          .order("rank", { ascending: true });

        if (favs && favs.length > 0) {
          // Get book metadata for favourites
          const isbns = favs.map((f: { isbn13: string }) => f.isbn13);
          const { data: bookMeta } = await supabase
            .from("books")
            .select("isbn13, title, image")
            .in("isbn13", isbns);

          const metaMap = new Map(
            (bookMeta ?? []).map((b: { isbn13: string; title: string; image: string }) => [
              b.isbn13,
              b,
            ])
          );

          setFavourites(
            favs.map((f: { isbn13: string; rank: number }) => ({
              isbn13: f.isbn13,
              rank: f.rank,
              title: (metaMap.get(f.isbn13) as { title: string })?.title ?? "Unknown",
              cover_url: (metaMap.get(f.isbn13) as { image: string })?.image ?? null,
            }))
          );
        }
      }

      setLoading(false);
    }

    load();
  }, [user, friendId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-center text-text-muted">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-center text-text-muted">User not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pt-4 pb-12 max-sm:px-4">
      {/* Back link */}
      <Link
        href="/friends"
        className="mb-4 inline-block text-sm text-accent hover:underline"
      >
        &larr; Back to friends
      </Link>

      {/* Profile header */}
      <div className="mb-8 flex items-center gap-4">
        {profile.avatar_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15 text-2xl font-bold text-accent">
            {profile.display_name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          <p className="text-text-muted">@{profile.username}</p>
          {profile.bio && (
            <p className="mt-1 text-sm text-text-muted">{profile.bio}</p>
          )}
        </div>
      </div>

      {!isFriend ? (
        <p className="py-8 text-center text-text-muted">
          You&apos;re not friends with this user. Send them a friend request to
          see their library.
        </p>
      ) : (
        <>
          {/* Favourites */}
          {favourites.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-bold">Favourites</h2>
              <div className="flex gap-3 overflow-x-auto">
                {favourites.map((fav) => (
                  <div key={fav.isbn13} className="w-20 flex-shrink-0 text-center">
                    <div className="aspect-[2/3] overflow-hidden rounded-lg bg-bg-medium shadow-[0_1px_4px_rgba(0,0,0,0.12)]">
                      {fav.cover_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={fav.cover_url}
                          alt={fav.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-1 text-[10px] text-text-subtle">
                          {fav.title}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] font-semibold text-accent">
                      #{fav.rank}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Books in common */}
          {booksInCommon.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-bold">
                Books in common ({booksInCommon.length})
              </h2>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                {booksInCommon.map((b) => (
                  <div
                    key={b.isbn13}
                    className="aspect-[2/3] overflow-hidden rounded-lg bg-bg-medium shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                  >
                    {b.cover_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={b.cover_url}
                        alt={b.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-1 text-[10px] text-text-subtle">
                        {b.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Friend's library */}
          <section>
            <h2 className="mb-3 text-lg font-bold">
              {profile.display_name}&apos;s library
            </h2>
            {friendBooks.length === 0 ? (
              <p className="py-8 text-center text-text-muted">
                No visible books yet.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {friendBooks.map((b) => (
                  <div
                    key={b.isbn13}
                    className="aspect-[2/3] overflow-hidden rounded-lg bg-bg-medium shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                  >
                    {b.cover_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={b.cover_url}
                        alt={b.title ?? "Book cover"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center p-2 text-center">
                        <p className="text-xs font-semibold text-text-muted">
                          {b.title}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
