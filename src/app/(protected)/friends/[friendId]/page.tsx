"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  started_at: string | null;
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
  status_message: string | null;
  created_at: string;
};

type ReactionSummary = {
  activity_user_id: string;
  isbn13: string;
  activity_type: string;
  emoji: string;
  count: number;
  reacted_by_me: boolean;
};

type CommentCount = {
  activity_user_id: string;
  isbn13: string;
  activity_type: string;
  count: number;
};

type ActivityComment = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
  author_username: string | null;
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

type LibraryBook = {
  isbn13: string;
  title: string | null;
  cover_url: string | null;
  first_author_name: string | null;
};

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

const STATUS_LABELS: Record<string, string> = {
  to_read: "To read",
  reading: "Reading",
  finished: "Finished",
  dnf: "DNF",
};

function friendlyStatus(status: string | null): string {
  if (!status) return "—";
  return STATUS_LABELS[status] ?? status;
}

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
    case "started":
      return "started reading";
    case "finished":
      return "finished reading";
    case "reviewed":
      return "reviewed";
    case "dnf":
      return "did not finish";
    default:
      return type;
  }
}

type BottomView = "feed" | "library";

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
  const [reactions, setReactions] = useState<ReactionSummary[]>([]);
  const [commentCounts, setCommentCounts] = useState<CommentCount[]>([]);
  const [booksInCommon, setBooksInCommon] = useState<BookInCommon[]>([]);
  const [showBooksInCommon, setShowBooksInCommon] = useState(false);
  const [bottomView, setBottomView] = useState<BottomView>("feed");
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "remove" | "block" | null
  >(null);

  const loadProfile = useCallback(async () => {
    if (!user) return;

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

    // Check friendship
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
      // Load friend library (used for currently reading + library tab)
      const { data: libraryData } = await supabase.rpc("get_friend_library", {
        friend_id: friendId,
      });
      const allBooks = (libraryData as any[]) ?? [];

      setCurrentlyReading(
        allBooks
          .filter((b: any) => b.status === "reading")
          .map((b: any) => ({
            isbn13: b.isbn13,
            title: b.title ?? null,
            cover_url: b.cover_url ?? null,
            first_author_name: b.first_author_name ?? null,
            started_at: b.started_at ?? null,
          }))
      );

      setLibraryBooks(
        allBooks.map((b: any) => ({
          isbn13: b.isbn13,
          title: b.title ?? null,
          cover_url: b.cover_url ?? null,
          first_author_name: b.first_author_name ?? null,
        }))
      );
      setLibraryLoaded(true);

      // Load favourites
      const { data: favData } = await supabase
        .from("user_favourites")
        .select("isbn13, rank, books(title, image)")
        .eq("user_id", friendId)
        .order("rank", { ascending: true });

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
        p_limit: 20,
        p_offset: 0,
        p_include_test_users: false,
      });
      const items = (activityData as ActivityItem[]) ?? [];
      setActivities(items);

      // Load engagement data
      if (items.length > 0) {
        const [reactionsRes, countsRes] = await Promise.all([
          supabase.rpc("get_reactions_for_activities", {
            p_activity_user_ids: items.map((i) => i.user_id),
            p_isbn13s: items.map((i) => i.book_isbn13 ?? ""),
            p_activity_types: items.map((i) => i.activity_type),
          }),
          supabase.rpc("get_comment_counts_for_activities", {
            p_activity_user_ids: items.map((i) => i.user_id),
            p_isbn13s: items.map((i) => i.book_isbn13 ?? ""),
            p_activity_types: items.map((i) => i.activity_type),
          }),
        ]);
        if (reactionsRes.data)
          setReactions(reactionsRes.data as ReactionSummary[]);
        if (countsRes.data)
          setCommentCounts(countsRes.data as CommentCount[]);
      }

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
    setIsFriend(null);
  }

  function getReactionsForItem(item: ActivityItem) {
    const isbn = item.book_isbn13 ?? "";
    return reactions.filter(
      (r) =>
        r.activity_user_id === item.user_id &&
        (r.isbn13 ?? "") === isbn &&
        r.activity_type === item.activity_type
    );
  }

  function getCommentCount(item: ActivityItem) {
    const isbn = item.book_isbn13 ?? "";
    return (
      commentCounts.find(
        (c) =>
          c.activity_user_id === item.user_id &&
          (c.isbn13 ?? "") === isbn &&
          c.activity_type === item.activity_type
      )?.count ?? 0
    );
  }

  async function handleToggleReaction(item: ActivityItem, emoji: string) {
    const { data } = await supabase.rpc("toggle_activity_reaction", {
      p_activity_user_id: item.user_id,
      p_isbn13: item.book_isbn13 ?? "",
      p_activity_type: item.activity_type,
      p_emoji: emoji,
    });

    const action = data as string;
    setReactions((prev) => {
      const existing = prev.find(
        (r) =>
          r.activity_user_id === item.user_id &&
          (r.isbn13 ?? "") === (item.book_isbn13 ?? "") &&
          r.activity_type === item.activity_type &&
          r.emoji === emoji
      );

      if (action === "added") {
        if (existing) {
          return prev.map((r) =>
            r === existing
              ? { ...r, count: r.count + 1, reacted_by_me: true }
              : r
          );
        }
        return [
          ...prev,
          {
            activity_user_id: item.user_id,
            isbn13: item.book_isbn13 ?? "",
            activity_type: item.activity_type,
            emoji,
            count: 1,
            reacted_by_me: true,
          },
        ];
      } else {
        if (existing && existing.count <= 1) {
          return prev.filter((r) => r !== existing);
        }
        return prev.map((r) =>
          r === existing
            ? { ...r, count: r.count - 1, reacted_by_me: false }
            : r
        );
      }
    });
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
        day: "numeric",
        month: "short",
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
                  onClick={() => {
                    setConfirmAction("remove");
                  }}
                  className="w-full cursor-pointer rounded px-3 py-2 text-left text-sm text-error hover:bg-error/10"
                >
                  Remove Friend
                </button>
                <button
                  onClick={() => {
                    setConfirmAction("block");
                  }}
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
        <Avatar
          url={profile.avatar_url}
          name={profile.display_name}
          size={80}
        />
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
              onClick={() => setBottomView("library")}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-(--radius-card) bg-accent p-4 text-white transition-opacity hover:opacity-88"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
              </svg>
              <span className="text-xs font-semibold">Library</span>
            </button>
            <button
              onClick={() => setShowBooksInCommon(true)}
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

          {/* Currently reading — matching public profile style */}
          {currentlyReading.length > 0 && (
            <section className="mb-6">
              <div className="overflow-hidden rounded-(--radius-card) bg-[#1a3a5c] p-4">
                <div className="mb-3 flex justify-center">
                  <span className="rounded-full bg-white/20 px-4 py-1 text-xs font-bold text-white">
                    Currently reading
                  </span>
                </div>
                <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto">
                  {currentlyReading.map((book) => (
                    <Link
                      key={book.isbn13}
                      href={`/library/${book.isbn13}`}
                      className="flex w-[280px] flex-shrink-0 snap-center gap-3"
                    >
                      <div className="aspect-[2/3] w-[80px] flex-shrink-0 overflow-hidden rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                        {book.cover_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={book.cover_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-white/10 text-[8px] text-white/50">
                            No cover
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col justify-center">
                        <p className="line-clamp-2 text-base font-semibold leading-tight text-white">
                          {book.title ?? "Untitled"}
                        </p>
                        {book.first_author_name && (
                          <p className="mt-1 text-sm text-white/60">
                            {book.first_author_name}
                          </p>
                        )}
                        {book.started_at && (
                          <p className="mt-1.5 text-xs text-white/40">
                            Started{" "}
                            {new Date(book.started_at).toLocaleDateString(
                              "en-GB",
                              { day: "numeric", month: "short" }
                            )}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Favourites — matching public profile style */}
          {favourites.length > 0 && (
            <section className="mb-6">
              <div className="rounded-(--radius-card) bg-[#dce8f5] p-5">
                <div className="mb-4 flex justify-center">
                  <span className="rounded-full bg-[#1a3a5c] px-4 py-1 text-xs font-bold text-white">
                    Favourites
                  </span>
                </div>
                <div className="flex justify-center gap-2">
                  {favourites.map((fav) => (
                    <Link
                      key={fav.isbn13}
                      href={`/library/${fav.isbn13}`}
                      className="aspect-[2/3] w-[calc((100%-2rem)/5)] max-w-[100px] flex-shrink-0 overflow-hidden rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.15)]"
                    >
                      {fav.cover_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={fav.cover_url}
                          alt={fav.title ?? ""}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white p-1 text-center text-[8px] text-text-subtle">
                          {fav.title}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Feed / Library toggle */}
          <div className="mb-4 flex rounded-full border border-border bg-bg-medium p-1">
            <button
              onClick={() => setBottomView("feed")}
              className={`flex-1 cursor-pointer rounded-full py-2 text-center text-sm font-semibold transition-colors ${
                bottomView === "feed"
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Activity
            </button>
            <button
              onClick={() => setBottomView("library")}
              className={`flex-1 cursor-pointer rounded-full py-2 text-center text-sm font-semibold transition-colors ${
                bottomView === "library"
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Library ({libraryBooks.length})
            </button>
          </div>

          {/* Feed view */}
          {bottomView === "feed" && (
            <div>
              {activities.length === 0 ? (
                <p className="py-8 text-center text-text-muted">
                  No activity yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {activities.map((item) => (
                    <ProfileActivityCard
                      key={item.id}
                      item={item}
                      reactions={getReactionsForItem(item)}
                      commentCount={getCommentCount(item)}
                      onToggleReaction={(emoji) =>
                        handleToggleReaction(item, emoji)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Library view */}
          {bottomView === "library" && (
            <div>
              {libraryBooks.length === 0 ? (
                <p className="py-8 text-center text-text-muted">
                  No visible books.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {libraryBooks.map((book) => (
                    <Link
                      key={book.isbn13}
                      href={`/library/${book.isbn13}`}
                      className="aspect-[2/3] overflow-hidden rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                    >
                      {book.cover_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={book.cover_url}
                          alt={book.title ?? ""}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-bg-medium p-2 text-center">
                          <p className="text-xs font-semibold leading-tight text-text-muted">
                            {book.title ?? "Untitled"}
                          </p>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Books in common modal */}
      {showBooksInCommon && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-20">
          <div className="w-full max-w-lg rounded-(--radius-card) bg-bg-light p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Books in common</h2>
              <button
                onClick={() => setShowBooksInCommon(false)}
                className="cursor-pointer rounded-full p-1.5 transition-colors hover:bg-bg-medium"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {booksInCommon.length === 0 ? (
              <p className="py-8 text-center text-text-muted">
                No books in common yet.
              </p>
            ) : (
              <div className="space-y-3">
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
                        <span className="text-[8px] text-text-subtle">
                          No cover
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {book.title ?? "Untitled"}
                      </p>
                      <div className="mt-1 flex gap-4 text-xs text-text-muted">
                        <span>
                          You: {friendlyStatus(book.your_status)}
                          {book.your_rating != null &&
                            ` · ${book.your_rating}/10`}
                        </span>
                        <span>
                          {profile?.display_name ?? "Friend"}:{" "}
                          {friendlyStatus(book.friend_status)}
                          {book.friend_rating != null &&
                            ` · ${book.friend_rating}/10`}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
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

// ── Activity card with engagement bar (matching main feed) ────

function ProfileActivityCard({
  item,
  reactions,
  commentCount,
  onToggleReaction,
}: {
  item: ActivityItem;
  reactions: ReactionSummary[];
  commentCount: number;
  onToggleReaction: (emoji: string) => void;
}) {
  const { user } = useAuth();
  const supabase = createClient();
  const isPost = item.activity_type === "post";
  const [showPicker, setShowPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadComments() {
    setLoadingComments(true);
    const { data } = await supabase.rpc("get_activity_comments", {
      p_activity_user_id: item.user_id,
      p_isbn13: item.book_isbn13 ?? "",
      p_activity_type: item.activity_type,
      p_limit: 50,
      p_offset: 0,
    });
    setComments((data as ActivityComment[]) ?? []);
    setLoadingComments(false);
  }

  async function handleSubmitComment() {
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    await supabase.rpc("add_activity_comment", {
      p_activity_user_id: item.user_id,
      p_isbn13: item.book_isbn13 ?? "",
      p_activity_type: item.activity_type,
      p_body: newComment.trim(),
      p_parent_id: null,
      p_mentions: [],
      p_tagged_books: [],
    });
    setNewComment("");
    setSubmitting(false);
    await loadComments();
  }

  async function handleDeleteComment(commentId: string) {
    await supabase.rpc("delete_activity_comment", { p_comment_id: commentId });
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  function handleToggleComments() {
    if (!showComments) loadComments();
    setShowComments(!showComments);
  }

  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-border-subtle">
      {/* Card content */}
      <div className="flex gap-4 bg-bg-medium p-4">
        {!isPost && item.book_image && (
          <Link
            href={`/library/${item.book_isbn13}`}
            className="flex-shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.book_image}
              alt=""
              className="h-[120px] w-[80px] rounded-lg object-cover shadow-sm"
            />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Avatar
              url={item.avatar_url}
              name={item.display_name}
              size={32}
            />
            <div className="min-w-0">
              <span className="text-sm font-semibold">
                {item.display_name ?? "User"}
              </span>
              <span className="ml-2 text-xs text-text-subtle">
                {relativeTime(item.created_at)}
              </span>
            </div>
          </div>

          {!isPost && (
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-text-muted">
                {activityText(item.activity_type)}{" "}
                {item.book_title && (
                  <span className="font-semibold text-text-primary">
                    {item.book_title}
                  </span>
                )}
              </p>
              {item.rating != null && item.rating > 0 && (
                <span className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-[#2a2a2a] px-2 py-1 text-xs font-bold text-white">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  {item.rating}
                </span>
              )}
            </div>
          )}

          {isPost && item.status_message && (
            <p className="text-sm whitespace-pre-line">
              {item.status_message}
            </p>
          )}

          {item.review && (
            <p className="mt-1 line-clamp-2 text-sm text-text-muted italic">
              &ldquo;{item.review}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Engagement bar */}
      <div className="flex items-center gap-2 border-t border-border-subtle bg-[#2a2a2a] px-3 py-2">
        {reactions
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map((r, i) => (
            <button
              key={`${r.emoji}-${i}`}
              onClick={() => onToggleReaction(r.emoji)}
              className={`cursor-pointer rounded-full px-2 py-0.5 text-xs transition-colors ${
                r.reacted_by_me
                  ? "bg-accent text-white"
                  : "bg-white/15 text-white"
              }`}
            >
              {r.emoji} {r.count}
            </button>
          ))}

        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="cursor-pointer rounded-full bg-white/10 px-2 py-0.5 text-xs text-white transition-colors hover:bg-white/20"
          >
            +
          </button>
          {showPicker && (
            <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-lg bg-bg-light p-2 shadow-lg">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onToggleReaction(emoji);
                    setShowPicker(false);
                  }}
                  className="cursor-pointer rounded p-1 text-lg transition-colors hover:bg-bg-medium"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        <button
          onClick={handleToggleComments}
          className="flex cursor-pointer items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white transition-colors hover:bg-white/20"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
            <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" />
          </svg>
          {commentCount > 0 && <span>{commentCount}</span>}
        </button>
      </div>

      {/* Comments thread */}
      {showComments && (
        <div className="border-t border-border-subtle bg-bg-light p-3">
          {loadingComments ? (
            <p className="py-2 text-center text-xs text-text-muted">
              Loading comments...
            </p>
          ) : comments.length === 0 ? (
            <p className="py-2 text-center text-xs text-text-muted">
              No comments yet.
            </p>
          ) : (
            <div className="mb-3 space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar
                    url={c.author_avatar_url}
                    name={c.author_display_name}
                    size={28}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold">
                        {c.author_display_name ?? "User"}
                      </span>
                      <span className="text-[10px] text-text-subtle">
                        {relativeTime(c.created_at)}
                        {c.edited_at && " (edited)"}
                      </span>
                      {user && c.author_id === user.id && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="cursor-pointer text-[10px] text-text-subtle transition-colors hover:text-error"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-text-primary">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
              placeholder="Add a comment..."
              className="flex-1 rounded-(--radius-input) border border-border bg-bg-light px-3 py-2 font-serif text-xs outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
            />
            <button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
              className="cursor-pointer rounded-(--radius-input) bg-accent px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
            >
              {submitting ? "..." : "Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
