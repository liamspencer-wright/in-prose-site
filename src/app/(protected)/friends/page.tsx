"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

type Tab = "feed" | "friends" | "find";

const TAB_LABELS: Record<Tab, string> = {
  feed: "Feed",
  friends: "Friends",
  find: "Find",
};

// ── Shared types ──────────────────────────────────────────────

type FriendProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
};

type FriendRequest = {
  friendship_id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  direction: "incoming" | "outgoing";
};

type SearchResult = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  friendship_status: string | null; // null, "pending", "accepted"
};

type FriendSuggestion = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  mutual_friends: number;
  shared_books: number;
  reason: string | null;
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
  status: string | null;
  rating: number | null;
  review: string | null;
  review_spoiler: boolean | null;
  status_message: string | null;
  status_image_url: string | null;
  created_at: string;
};

// ── Avatar helper ─────────────────────────────────────────────

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
      className="flex items-center justify-center rounded-full bg-accent text-xl font-bold text-white"
    >
      {initial}
    </div>
  );
}

// ── Relative time formatting ──────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "yesterday";
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffDay < 90) return `${diffWeek}w ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffDay < 730) return `${diffMonth}mo ago`;
  const diffYear = Math.floor(diffDay / 365);
  return `${diffYear}y ago`;
}

// ── Activity type display ─────────────────────────────────────

function activityText(type: string): string {
  switch (type) {
    case "started":
      return "started reading";
    case "finished":
      return "finished";
    case "reviewed":
      return "reviewed";
    case "dnf":
      return "did not finish";
    case "target_met":
      return "met a reading target";
    default:
      return type;
  }
}

// ══════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");

  return (
    <div className="mx-auto w-full max-w-4xl px-6 pt-4 pb-12 max-sm:px-4">
      <h1 className="mb-6 text-3xl font-bold">Friends</h1>

      {/* Tab switcher */}
      <div className="mb-6 flex rounded-full border border-border bg-bg-medium p-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 cursor-pointer rounded-full py-2 text-center text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "bg-accent text-white"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "feed" && <FeedTab />}
      {activeTab === "friends" && <FriendsTab />}
      {activeTab === "find" && <FindTab />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  FEED TAB (#43)
// ══════════════════════════════════════════════════════════════

type FeedFilter = "all" | "activity" | "post";

const FEED_FILTER_LABELS: Record<FeedFilter, string> = {
  all: "All",
  activity: "Activity",
  post: "Posts",
};

function FeedTab() {
  const { user } = useAuth();
  const supabase = createClient();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  const loadFeed = useCallback(
    async (pageOffset: number, append: boolean) => {
      if (!user) return;
      const activityType =
        filter === "all" ? null : filter === "activity" ? "activity" : "post";

      const { data, error } = await supabase.rpc(
        "get_friends_activity_feed",
        {
          p_activity_type: activityType,
          p_limit: PAGE_SIZE,
          p_offset: pageOffset,
          p_include_test_users: false,
        }
      );

      if (error) {
        console.error("Feed error:", error.message);
        return;
      }

      const items = (data as ActivityItem[]) ?? [];
      if (append) {
        setActivities((prev) => [...prev, ...items]);
      } else {
        setActivities(items);
      }
      setHasMore(items.length >= PAGE_SIZE);
    },
    [user, supabase, filter]
  );

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    loadFeed(0, false).finally(() => setLoading(false));
  }, [loadFeed]);

  function handleLoadMore() {
    const next = offset + PAGE_SIZE;
    setOffset(next);
    setLoadingMore(true);
    loadFeed(next, true).finally(() => setLoadingMore(false));
  }

  if (loading) {
    return <p className="py-12 text-center text-text-muted">Loading feed...</p>;
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(FEED_FILTER_LABELS) as FeedFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === f
                ? "bg-accent text-white"
                : "bg-bg-medium text-text-muted hover:bg-accent/10"
            }`}
          >
            {FEED_FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {activities.length === 0 ? (
        <p className="py-12 text-center text-text-muted">
          No friend activity yet — add friends to see what they&apos;re reading.
        </p>
      ) : (
        <div className="space-y-4">
          {activities.map((item) => (
            <ActivityCard key={item.id} item={item} />
          ))}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mx-auto block cursor-pointer rounded-(--radius-input) border-[1.5px] border-accent px-6 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white disabled:cursor-default disabled:opacity-55"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const isPost = item.activity_type === "post";

  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-border-subtle bg-bg-medium">
      <div className="flex gap-4 p-4">
        {/* Book cover (non-post activities) */}
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
          {/* User info */}
          <div className="mb-2 flex items-center gap-2">
            <Link href={`/friends/${item.user_id}`} className="flex-shrink-0">
              <Avatar url={item.avatar_url} name={item.display_name} size={32} />
            </Link>
            <div className="min-w-0">
              <Link
                href={`/friends/${item.user_id}`}
                className="text-sm font-semibold hover:underline"
              >
                {item.display_name ?? "User"}
              </Link>
              <span className="ml-2 text-xs text-text-subtle">
                {relativeTime(item.created_at)}
              </span>
            </div>
          </div>

          {/* Activity text */}
          {!isPost && (
            <p className="text-sm text-text-muted">
              {activityText(item.activity_type)}{" "}
              {item.book_title && (
                <span className="font-semibold text-text-primary">
                  {item.book_title}
                </span>
              )}
            </p>
          )}

          {/* Post text */}
          {isPost && item.status_message && (
            <p className="text-sm whitespace-pre-line">{item.status_message}</p>
          )}

          {/* Rating */}
          {item.rating != null && item.rating > 0 && (
            <p className="mt-1 text-sm font-semibold text-accent">
              {item.rating}/10
            </p>
          )}

          {/* Review excerpt */}
          {item.review && (
            <p className="mt-1 line-clamp-2 text-sm text-text-muted italic">
              &ldquo;{item.review}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  FRIENDS TAB (#40 + #41)
// ══════════════════════════════════════════════════════════════

function FriendsTab() {
  const { user } = useAuth();
  const supabase = createClient();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showRequests, setShowRequests] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "remove" | "block";
    friend: FriendProfile;
  } | null>(null);

  const loadFriends = useCallback(async () => {
    if (!user) return;

    // Load friendships with joined profiles
    const { data: rows } = await supabase
      .from("friendships")
      .select(
        "id, requester_id, addressee_id, status, requester_profile:profiles!friendships_requester_id_fkey(id, display_name, avatar_url, username), addressee_profile:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url, username)"
      )
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!rows) {
      setLoading(false);
      return;
    }

    // Separate accepted friends and pending requests
    const accepted: FriendProfile[] = [];
    const pending: FriendRequest[] = [];
    const seen = new Set<string>();

    for (const row of rows as any[]) {
      const isRequester = row.requester_id === user.id;
      const otherProfile = isRequester
        ? row.addressee_profile
        : row.requester_profile;

      if (row.status === "accepted") {
        const otherId = isRequester ? row.addressee_id : row.requester_id;
        if (seen.has(otherId)) continue;
        seen.add(otherId);
        accepted.push({
          id: otherId,
          display_name: otherProfile?.display_name ?? null,
          avatar_url: otherProfile?.avatar_url ?? null,
          username: otherProfile?.username ?? null,
        });
      } else if (row.status === "pending") {
        const otherId = isRequester ? row.addressee_id : row.requester_id;
        pending.push({
          friendship_id: row.id,
          user_id: otherId,
          display_name: otherProfile?.display_name ?? null,
          username: otherProfile?.username ?? null,
          avatar_url: otherProfile?.avatar_url ?? null,
          direction: isRequester ? "outgoing" : "incoming",
        });
      }
    }

    // Sort by display name
    accepted.sort((a, b) =>
      (a.display_name ?? "").localeCompare(b.display_name ?? "")
    );

    setFriends(accepted);
    setPendingRequests(pending);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  async function handleRemoveFriend(friendId: string) {
    await supabase.rpc("remove_friend", { p_friend_id: friendId });
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
    setConfirmAction(null);
  }

  async function handleBlockUser(userId: string) {
    await supabase.rpc("block_user", { p_blocked_id: userId });
    setFriends((prev) => prev.filter((f) => f.id !== userId));
    setConfirmAction(null);
  }

  const filtered = search.trim()
    ? friends.filter(
        (f) =>
          f.display_name?.toLowerCase().includes(search.toLowerCase()) ||
          f.username?.toLowerCase().includes(search.toLowerCase())
      )
    : friends;

  const pendingCount = pendingRequests.filter(
    (r) => r.direction === "incoming"
  ).length;

  if (loading) {
    return (
      <p className="py-12 text-center text-text-muted">Loading friends...</p>
    );
  }

  return (
    <div>
      {/* Friend Requests button */}
      <button
        onClick={() => setShowRequests(true)}
        className="mb-4 flex w-full cursor-pointer items-center gap-3 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-3 transition-colors hover:border-accent"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 flex-shrink-0 fill-accent"
        >
          <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
        <span className="flex-1 text-left text-sm font-semibold">
          Friend Requests
        </span>
        {pendingCount > 0 && (
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">
            {pendingCount}
          </span>
        )}
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current opacity-40">
          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
        </svg>
      </button>

      {/* Section header */}
      <h2 className="mb-3 text-lg font-bold">
        Your friends{" "}
        {friends.length > 0 && (
          <span className="text-text-muted font-normal">
            ({friends.length})
          </span>
        )}
      </h2>

      {/* Search (show when >3 friends) */}
      {friends.length > 3 && (
        <input
          type="text"
          placeholder="Search friends..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
        />
      )}

      {/* Friends grid */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-text-muted">
          {friends.length === 0
            ? "You haven't added any friends yet."
            : "No friends match your search."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((friend) => (
            <div key={friend.id} className="group relative">
              <Link
                href={`/friends/${friend.id}`}
                className="flex flex-col items-center gap-2 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-4 transition-colors hover:border-accent"
              >
                <Avatar
                  url={friend.avatar_url}
                  name={friend.display_name}
                  size={80}
                />
                <span className="line-clamp-2 text-center text-sm font-semibold">
                  {friend.display_name ?? "Friend"}
                </span>
              </Link>

              {/* Overflow menu */}
              <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setConfirmAction({ type: "remove", friend });
                  }}
                  className="cursor-pointer rounded-full bg-bg-light p-1.5 text-text-subtle shadow-sm transition-colors hover:text-error"
                  title="Options"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <ConfirmDialog
          title={
            confirmAction.type === "remove"
              ? `Remove ${confirmAction.friend.display_name ?? "this user"} as a friend?`
              : `Block ${confirmAction.friend.display_name ?? "this user"}?`
          }
          description={
            confirmAction.type === "block"
              ? "They won't be notified. This will also remove them as a friend."
              : undefined
          }
          confirmLabel={
            confirmAction.type === "remove" ? "Remove Friend" : "Block User"
          }
          onConfirm={() =>
            confirmAction.type === "remove"
              ? handleRemoveFriend(confirmAction.friend.id)
              : handleBlockUser(confirmAction.friend.id)
          }
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Friend Requests modal */}
      {showRequests && (
        <FriendRequestsModal
          requests={pendingRequests}
          onClose={() => setShowRequests(false)}
          onUpdate={loadFriends}
        />
      )}
    </div>
  );
}

// ── Confirmation dialog ───────────────────────────────────────

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-(--radius-card) bg-bg-light p-6 shadow-lg">
        <h3 className="mb-2 text-lg font-bold">{title}</h3>
        {description && (
          <p className="mb-4 text-sm text-text-muted">{description}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 cursor-pointer rounded-(--radius-input) border-[1.5px] border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:border-accent"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 cursor-pointer rounded-(--radius-input) bg-error px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-88"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  FRIEND REQUESTS MODAL (#41)
// ══════════════════════════════════════════════════════════════

function FriendRequestsModal({
  requests,
  onClose,
  onUpdate,
}: {
  requests: FriendRequest[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const supabase = createClient();
  const [actioning, setActioning] = useState<string | null>(null);

  const incoming = requests.filter((r) => r.direction === "incoming");
  const outgoing = requests.filter((r) => r.direction === "outgoing");

  async function handleAccept(friendshipId: string) {
    setActioning(friendshipId);
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    onUpdate();
    setActioning(null);
  }

  async function handleDecline(friendshipId: string) {
    setActioning(friendshipId);
    await supabase.from("friendships").delete().eq("id", friendshipId);
    onUpdate();
    setActioning(null);
  }

  async function handleCancel(friendshipId: string) {
    setActioning(friendshipId);
    await supabase.from("friendships").delete().eq("id", friendshipId);
    onUpdate();
    setActioning(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-20">
      <div className="w-full max-w-lg rounded-(--radius-card) bg-bg-light p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Friend Requests</h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-full p-1.5 transition-colors hover:bg-bg-medium"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Incoming */}
        <h3 className="mb-2 text-sm font-semibold text-text-muted">
          Incoming
        </h3>
        {incoming.length === 0 ? (
          <p className="mb-4 text-sm text-text-subtle">No pending requests</p>
        ) : (
          <div className="mb-4 space-y-3">
            {incoming.map((req) => (
              <div key={req.friendship_id} className="flex items-center gap-3">
                <Avatar url={req.avatar_url} name={req.display_name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {req.display_name ?? "User"}
                  </p>
                  {req.username && (
                    <p className="text-xs text-text-muted">@{req.username}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDecline(req.friendship_id)}
                  disabled={actioning === req.friendship_id}
                  className="cursor-pointer rounded-(--radius-input) border-[1.5px] border-error px-3 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error hover:text-white disabled:opacity-55"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAccept(req.friendship_id)}
                  disabled={actioning === req.friendship_id}
                  className="cursor-pointer rounded-(--radius-input) bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-88 disabled:opacity-55"
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Outgoing */}
        <h3 className="mb-2 text-sm font-semibold text-text-muted">
          Outgoing
        </h3>
        {outgoing.length === 0 ? (
          <p className="text-sm text-text-subtle">No pending requests</p>
        ) : (
          <div className="space-y-3">
            {outgoing.map((req) => (
              <div key={req.friendship_id} className="flex items-center gap-3">
                <Avatar url={req.avatar_url} name={req.display_name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {req.display_name ?? "User"}
                  </p>
                  {req.username && (
                    <p className="text-xs text-text-muted">@{req.username}</p>
                  )}
                </div>
                <button
                  onClick={() => handleCancel(req.friendship_id)}
                  disabled={actioning === req.friendship_id}
                  className="cursor-pointer text-xs font-semibold text-error transition-opacity hover:opacity-70 disabled:opacity-55"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  FIND TAB (#42)
// ══════════════════════════════════════════════════════════════

function FindTab() {
  const { user } = useAuth();
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load suggestions on mount
  useEffect(() => {
    if (!user) return;

    async function loadSuggestions() {
      const { data } = await supabase.rpc("get_friend_suggestions", {
        p_limit: 10,
        p_include_test_users: false,
      });
      setSuggestions((data as FriendSuggestion[]) ?? []);
      setLoadingSuggestions(false);
    }

    loadSuggestions();
  }, [user, supabase]);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const { data } = await supabase.rpc("search_users", {
        p_query: query.trim(),
        p_limit: 20,
        p_offset: 0,
        p_include_test_users: false,
      });
      setResults((data as SearchResult[]) ?? []);
      setSearching(false);
    }, 400);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, supabase]);

  async function handleSendRequest(userId: string) {
    if (!user) return;
    setSendingTo(userId);

    await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: userId,
      status: "pending",
    });

    // Update status in results
    setResults((prev) =>
      prev.map((r) =>
        r.user_id === userId ? { ...r, friendship_status: "pending" } : r
      )
    );
    // Update suggestions too
    setSuggestions((prev) => prev.filter((s) => s.user_id !== userId));
    setSendingTo(null);
  }

  function statusButton(userId: string, status: string | null) {
    if (status === "accepted") {
      return (
        <span className="rounded-full bg-bg-medium px-3 py-1.5 text-xs font-semibold text-text-muted">
          Friends
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="rounded-full border-[1.5px] border-border px-3 py-1.5 text-xs font-semibold text-text-muted">
          Pending
        </span>
      );
    }
    return (
      <button
        onClick={() => handleSendRequest(userId)}
        disabled={sendingTo === userId}
        className="cursor-pointer rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-88 disabled:opacity-55"
      >
        {sendingTo === userId ? "..." : "Add"}
      </button>
    );
  }

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-4">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 fill-text-subtle"
        >
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          placeholder="Search by @username or name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-bg-light py-3 pr-10 pl-11 font-serif outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-full p-1 text-text-subtle hover:text-text-primary"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        )}
      </div>

      {/* Search results */}
      {query.trim().length >= 2 ? (
        searching ? (
          <p className="py-8 text-center text-text-muted">Searching...</p>
        ) : results.length === 0 ? (
          <p className="py-8 text-center text-text-muted">No users found.</p>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <div
                key={r.user_id}
                className="flex items-center gap-3 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-3"
              >
                <Avatar url={r.avatar_url} name={r.display_name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {r.display_name ?? "User"}
                  </p>
                  {r.username && (
                    <p className="text-xs text-text-muted">@{r.username}</p>
                  )}
                </div>
                {statusButton(r.user_id, r.friendship_status)}
              </div>
            ))}
          </div>
        )
      ) : (
        /* Suggestions (when not searching) */
        <div>
          <h3 className="mb-3 text-lg font-bold">People you may know</h3>
          {loadingSuggestions ? (
            <p className="py-8 text-center text-text-muted">
              Loading suggestions...
            </p>
          ) : suggestions.length === 0 ? (
            <p className="py-8 text-center text-text-muted">
              No suggestions right now.
            </p>
          ) : (
            <div className="space-y-2">
              {suggestions.map((s) => (
                <div
                  key={s.user_id}
                  className="flex items-center gap-3 rounded-(--radius-card) border border-border-subtle bg-bg-medium p-3"
                >
                  <Avatar url={s.avatar_url} name={s.display_name} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {s.display_name ?? "User"}
                    </p>
                    {s.reason && (
                      <p className="text-xs text-text-muted">{s.reason}</p>
                    )}
                  </div>
                  {statusButton(s.user_id, null)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
