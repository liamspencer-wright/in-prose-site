"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  description: string | null;
  created_at: string | null;
};

type ReadingBook = {
  isbn13: string;
  title: string | null;
  cover_url: string | null;
  first_author_name: string | null;
};

type Favourite = {
  isbn13: string;
  rank: number;
  title: string | null;
  cover_url: string | null;
};

type ActivityItem = {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  book_isbn13: string | null;
  book_title: string | null;
  book_image: string | null;
  activity_type: string;
  rating: number | null;
  review: string | null;
  created_at: string;
};

type BookInCommon = {
  isbn13: string;
  title: string | null;
  cover_url: string | null;
  first_author_name: string | null;
  your_status: string | null;
  your_rating: number | null;
  friend_status: string | null;
  friend_rating: number | null;
};

function Avatar({
  url,
  name,
  size = 80,
}: {
  url: string | null;
  name: string | null;
  size?: number;
}) {
  const initial = (name ?? "?").charAt(0).toUpperCase();
  return url ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt=""
      style={{ width: size, height: size }}
      className="rounded-full object-cover"
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-accent text-2xl font-bold text-white"
    >
      {initial}
    </div>
  );
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "yesterday";
  if (diffDay < 30) return `${diffDay}d ago`;
  if (diffDay < 90) return `${Math.floor(diffDay / 7)}w ago`;
  if (diffDay < 730) return `${Math.floor(diffDay / 30)}mo ago`;
  return `${Math.floor(diffDay / 365)}y ago`;
}

function activityText(type: string): string {
  switch (type) {
    case "started": return "started reading";
    case "finished": return "finished";
    case "reviewed": return "reviewed";
    case "dnf": return "did not finish";
    default: return type;
  }
}

export default function FriendProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const friendId = params.friendId as string;
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isFriend, setIsFriend] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentlyReading, setCurrentlyReading] = useState<ReadingBook[]>([]);
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [booksInCommon, setBooksInCommon] = useState<BookInCommon[]>([]);
  const [showBooksInCommon, setShowBooksInCommon] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryBooks, setLibraryBooks] = useState<ReadingBook[]>([]);
  const [confirmAction, setConfirmAction] = useState<"remove" | "block" | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    // Load profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, description, created_at")
      .eq("id", friendId)
      .maybeSingle();

    if (!profileData) {
      setLoading(false);
      return;
    }
    setProfile(profileData);

    // Check friendship via direct query (matching iOS app pattern)
    const { data: friendshipRows } = await supabase
      .from("friendships")
      .select("id")
      .eq("status", "accepted")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`
      )
      .limit(1);
    const areFriends = (friendshipRows?.length ?? 0) > 0;
    setIsFriend(areFriends);

    if (areFriends) {
      // Load currently reading (via RPC since user_books_expanded_all has security_invoker)
      const { data: libraryData, error: libErr } = await supabase.rpc(
        "get_friend_library",
        { friend_id: friendId }
      );
      if (libErr) console.error("get_friend_library error:", libErr.message);
      const allBooks = (libraryData as any[]) ?? [];
      setCurrentlyReading(
        allBooks
          .filter((b: any) => b.status === "reading")
          .map((b: any) => ({
            isbn13: b.isbn13,
            title: b.title ?? null,
            cover_url: b.cover_url ?? null,
            first_author_name: b.first_author_name ?? null,
          }))
      );

      // Load favourites
      const { data: favData, error: favErr } = await supabase
        .from("user_favourites")
        .select("isbn13, rank, books(title, image)")
        .eq("user_id", friendId)
        .order("rank", { ascending: true });
      if (favErr) console.error("favourites error:", favErr.message);

      if (favData) {
        setFavourites(
          (favData as any[]).map((f) => ({
            isbn13: f.isbn13,
            rank: f.rank,
            title: f.books?.title ?? null,
            cover_url: f.books?.image ?? null,
          }))
        );
      }

      // Load activity feed
      const { data: activityData } = await supabase.rpc("get_activity_feed", {
        p_user_id: friendId,
        p_activity_type: null,
        p_limit: 10,
        p_offset: 0,
        p_include_test_users: false,
      });
      setActivities((activityData as ActivityItem[]) ?? []);

      // Load books in common
      const { data: commonData } = await supabase.rpc("get_books_in_common", {
        friend_id: friendId,
      });
      setBooksInCommon((commonData as BookInCommon[]) ?? []);
    }

    setLoading(false);
  }, [user, friendId, supabase]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleRemoveFriend() {
    await supabase.rpc("remove_friend", { p_friend_id: friendId });
    router.push("/friends");
  }

  async function handleBlockUser() {
    await supabase.rpc("block_user", { p_blocked_id: friendId });
    router.push("/friends");
  }

  async function handleSendRequest() {
    if (!user) return;
    await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: friendId,
      status: "pending",
    });
    setIsFriend(null); // show "pending" state
  }

  async function loadFriendLibrary() {
    const { data } = await supabase.rpc("get_friend_library", {
      friend_id: friendId,
    });
    setLibraryBooks(
      ((data as any[]) ?? []).map((b: any) => ({
        isbn13: b.isbn13,
        title: b.title ?? null,
        cover_url: b.cover_url ?? null,
        first_author_name: b.first_author_name ?? null,
      }))
    );
    setShowLibrary(true);
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 pt-4 pb-12 max-sm:px-4">
        <p className="py-20 text-center text-text-muted">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 pt-4 pb-12 max-sm:px-4">
        <p className="py-20 text-center text-text-muted">User not found.</p>
      </div>
    );
  }

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pt-4 pb-12 max-sm:px-4">
      {/* Back + overflow menu */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => router.push("/friends")}
          className="cursor-pointer text-sm font-semibold text-accent hover:underline"
        >
          &larr; Back to friends
        </button>
        {isFriend && (
          <div className="relative">
            <button
              onClick={() =>
                setConfirmAction(confirmAction ? null : "remove")
              }
              className="cursor-pointer rounded-full p-2 transition-colors hover:bg-bg-medium"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            {confirmAction && (
              <div className="absolute top-full right-0 z-10 mt-1 w-48 rounded-(--radius-card) border border-border bg-bg-light p-1 shadow-lg">
                <button
                  onClick={() => setConfirmAction("remove")}
                  className="w-full cursor-pointer rounded px-3 py-2 text-left text-sm text-error hover:bg-error/10"
                >
                  Remove Friend
                </button>
                <button
                  onClick={() => setConfirmAction("block")}
                  className="w-full cursor-pointer rounded px-3 py-2 text-left text-sm text-error hover:bg-error/10"
                >
                  Block User
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile header */}
      <div className="mb-6 flex flex-col items-center text-center">
        <Avatar url={profile.avatar_url} name={profile.display_name} size={80} />
        <h1 className="mt-3 text-2xl font-bold">
          {profile.display_name ?? "User"}
        </h1>
        {profile.username && (
          <p className="text-sm text-text-muted">@{profile.username}</p>
        )}
        {profile.description && (
          <p className="mt-2 max-w-md text-sm text-text-muted">
            {profile.description}
          </p>
        )}
        {memberSince && (
          <p className="mt-1 text-xs text-text-subtle">
            Member since {memberSince}
          </p>
        )}
      </div>

      {/* Non-friend state */}
      {isFriend === false && (
        <div className="mb-6 text-center">
          <button
            onClick={handleSendRequest}
            className="cursor-pointer rounded-(--radius-input) bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-88"
          >
            Send Friend Request
          </button>
        </div>
      )}

      {isFriend === null && (
        <p className="mb-6 text-center text-sm text-text-muted">
          Friend request pending
        </p>
      )}

      {/* Friend content */}
      {isFriend && (
        <>
          {/* Action buttons */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              onClick={loadFriendLibrary}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-(--radius-card) bg-accent p-4 text-white transition-opacity hover:opacity-88"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
              </svg>
              <span className="text-xs font-semibold">Library</span>
            </button>
            <button
              onClick={() => setShowBooksInCommon(!showBooksInCommon)}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-(--radius-card) bg-accent p-4 text-white transition-opacity hover:opacity-88"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
              <span className="text-xs font-semibold">
                In Common ({booksInCommon.length})
              </span>
            </button>
          </div>

          {/* Currently reading */}
          {currentlyReading.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 text-lg font-bold">Currently reading</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {currentlyReading.map((book) => (
                  <Link
                    key={book.isbn13}
                    href={`/library/${book.isbn13}`}
                    className="flex-shrink-0"
                  >
                    <div className="w-[100px]">
                      {book.cover_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={book.cover_url}
                          alt=""
                          className="mb-1 aspect-[2/3] w-full rounded-lg object-cover shadow-sm"
                        />
                      ) : (
                        <div className="mb-1 flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-bg-medium p-2">
                          <span className="text-xs text-text-muted">
                            {book.title ?? "Book"}
                          </span>
                        </div>
                      )}
                      <p className="line-clamp-2 text-xs font-semibold">
                        {book.title}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Favourites */}
          {favourites.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 text-lg font-bold">Favourites</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {favourites.map((fav) => (
                  <Link
                    key={fav.isbn13}
                    href={`/library/${fav.isbn13}`}
                    className="relative flex-shrink-0"
                  >
                    <div className="w-[100px]">
                      {fav.cover_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={fav.cover_url}
                          alt=""
                          className="mb-1 aspect-[2/3] w-full rounded-lg object-cover shadow-sm"
                        />
                      ) : (
                        <div className="mb-1 flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-bg-medium p-2">
                          <span className="text-xs text-text-muted">
                            {fav.title ?? "Book"}
                          </span>
                        </div>
                      )}
                      <p className="line-clamp-2 text-xs font-semibold">
                        {fav.title}
                      </p>
                      {/* Rank badge */}
                      <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                        {fav.rank}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Books in common (expandable) */}
          {showBooksInCommon && booksInCommon.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 text-lg font-bold">Books in common</h2>
              <div className="space-y-2">
                {booksInCommon.map((book) => (
                  <Link
                    key={book.isbn13}
                    href={`/library/${book.isbn13}`}
                    className="flex items-center gap-3 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-3 transition-colors hover:border-accent"
                  >
                    {book.cover_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={book.cover_url}
                        alt=""
                        className="h-16 w-11 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-11 items-center justify-center rounded bg-bg-light">
                        <span className="text-[8px] text-text-subtle">No cover</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {book.title ?? "Untitled"}
                      </p>
                      <p className="text-xs text-text-muted">
                        You: {book.your_status ?? "—"}
                        {book.your_rating != null && ` · ${book.your_rating}/10`}
                        {" · "}
                        Friend: {book.friend_status ?? "—"}
                        {book.friend_rating != null &&
                          ` · ${book.friend_rating}/10`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {showBooksInCommon && booksInCommon.length === 0 && (
            <p className="mb-6 text-center text-sm text-text-muted">
              No books in common yet.
            </p>
          )}

          {/* Friend library (expandable) */}
          {showLibrary && (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {profile.display_name ?? "Friend"}&apos;s Library
                </h2>
                <button
                  onClick={() => setShowLibrary(false)}
                  className="cursor-pointer text-xs text-text-subtle hover:text-text-muted"
                >
                  Close
                </button>
              </div>
              {libraryBooks.length === 0 ? (
                <p className="text-sm text-text-muted">No visible books.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                  {libraryBooks.map((book) => (
                    <Link
                      key={book.isbn13}
                      href={`/library/${book.isbn13}`}
                      className="aspect-[2/3] overflow-hidden rounded-lg shadow-sm transition-shadow hover:shadow-md"
                    >
                      {book.cover_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={book.cover_url}
                          alt={book.title ?? ""}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-bg-medium p-1 text-center text-[10px] text-text-muted">
                          {book.title ?? "Book"}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity feed */}
          {activities.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-bold">Recent activity</h2>
              <div className="space-y-3">
                {activities.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-(--radius-card) border border-border-subtle bg-bg-medium p-3"
                  >
                    <div className="flex gap-3">
                      {item.book_image && (
                        <Link
                          href={`/library/${item.book_isbn13}`}
                          className="flex-shrink-0"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.book_image}
                            alt=""
                            className="h-[90px] w-[60px] rounded object-cover shadow-sm"
                          />
                        </Link>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">
                            {activityText(item.activity_type)}
                          </span>{" "}
                          {item.book_title && (
                            <span className="font-semibold text-text-primary">
                              {item.book_title}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-text-subtle">
                          {relativeTime(item.created_at)}
                        </p>
                        {item.rating != null && item.rating > 0 && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-lg bg-[#2a2a2a] px-2 py-1 text-xs font-bold text-white">
                            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white">
                              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                            {item.rating}
                          </span>
                        )}
                        {item.review && (
                          <p className="mt-1 line-clamp-2 text-xs text-text-muted italic">
                            &ldquo;{item.review}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-(--radius-card) bg-bg-light p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-bold">
              {confirmAction === "remove"
                ? `Remove ${profile.display_name ?? "this user"} as a friend?`
                : `Block ${profile.display_name ?? "this user"}?`}
            </h3>
            {confirmAction === "block" && (
              <p className="mb-4 text-sm text-text-muted">
                They won&apos;t be notified. This will also remove them as a
                friend.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 cursor-pointer rounded-(--radius-input) border-[1.5px] border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:border-accent"
              >
                Cancel
              </button>
              <button
                onClick={
                  confirmAction === "remove"
                    ? handleRemoveFriend
                    : handleBlockUser
                }
                className="flex-1 cursor-pointer rounded-(--radius-input) bg-error px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-88"
              >
                {confirmAction === "remove" ? "Remove Friend" : "Block User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
