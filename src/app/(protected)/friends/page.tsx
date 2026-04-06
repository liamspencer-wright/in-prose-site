"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import UserAvatar from "@/components/user-avatar";

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
  badge_type: string | null;
  username: string | null;
};

type FriendRequest = {
  friendship_id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  badge_type: string | null;
  direction: "incoming" | "outgoing";
};

type SearchResult = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  badge_type: string | null;
  friendship_status: string | null; // null, "pending", "accepted"
};

type FriendSuggestion = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  badge_type: string | null;
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
  badge_type: string | null;
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

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];


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
  const [reactions, setReactions] = useState<ReactionSummary[]>([]);
  const [commentCounts, setCommentCounts] = useState<CommentCount[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const PAGE_SIZE = 20;

  async function loadEngagement(items: ActivityItem[], append: boolean) {
    if (items.length === 0) return;

    const userIds = items.map((i) => i.user_id);
    const isbn13s = items.map((i) => i.book_isbn13 ?? "");
    const types = items.map((i) => i.activity_type);

    try {
      const [reactionsRes, countsRes] = await Promise.all([
        supabase.rpc("get_reactions_for_activities", {
          p_activity_user_ids: userIds,
          p_isbn13s: isbn13s,
          p_activity_types: types,
        }),
        supabase.rpc("get_comment_counts_for_activities", {
          p_activity_user_ids: userIds,
          p_isbn13s: isbn13s,
          p_activity_types: types,
        }),
      ]);

      if (reactionsRes.error) {
        console.error("Reactions RPC error:", reactionsRes.error.message);
      }
      if (countsRes.error) {
        console.error("Comment counts RPC error:", countsRes.error.message);
      }

      const newReactions = (reactionsRes.data as ReactionSummary[]) ?? [];
      const newCounts = (countsRes.data as CommentCount[]) ?? [];

      if (append) {
        setReactions((prev) => [...prev, ...newReactions]);
        setCommentCounts((prev) => [...prev, ...newCounts]);
      } else {
        setReactions(newReactions);
        setCommentCounts(newCounts);
      }
    } catch (e) {
      console.error("Engagement load error:", e);
    }
  }

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

      // Load engagement data for these items
      await loadEngagement(items, append);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const key = `${item.user_id}-${item.book_isbn13 ?? ""}-${item.activity_type}-${emoji}`;
      const existing = prev.find(
        (r) =>
          r.activity_user_id === item.user_id &&
          r.isbn13 === (item.book_isbn13 ?? "") &&
          r.activity_type === item.activity_type &&
          r.emoji === emoji
      );

      if (action === "added") {
        if (existing) {
          return prev.map((r) =>
            r.activity_user_id === item.user_id &&
            r.isbn13 === (item.book_isbn13 ?? "") &&
            r.activity_type === item.activity_type &&
            r.emoji === emoji
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
        // removed
        if (existing && existing.count <= 1) {
          return prev.filter(
            (r) =>
              !(
                r.activity_user_id === item.user_id &&
                r.isbn13 === (item.book_isbn13 ?? "") &&
                r.activity_type === item.activity_type &&
                r.emoji === emoji
              )
          );
        }
        return prev.map((r) =>
          r.activity_user_id === item.user_id &&
          r.isbn13 === (item.book_isbn13 ?? "") &&
          r.activity_type === item.activity_type &&
          r.emoji === emoji
            ? { ...r, count: r.count - 1, reacted_by_me: false }
            : r
        );
      }
    });
  }

  if (loading) {
    return <p className="py-12 text-center text-text-muted">Loading feed...</p>;
  }

  function handlePostCreated() {
    setShowCompose(false);
    // Reload the feed
    setLoading(true);
    setOffset(0);
    loadFeed(0, false).finally(() => setLoading(false));
  }

  return (
    <div>
      {/* Filter bar + compose button */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex flex-wrap gap-2">
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
        <div className="flex-1" />
        <button
          onClick={() => setShowCompose(true)}
          className="cursor-pointer rounded-full bg-accent p-2.5 text-white shadow-md transition-opacity hover:opacity-88"
          title="New post"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        </button>
      </div>

      {activities.length === 0 ? (
        <p className="py-12 text-center text-text-muted">
          No friend activity yet — add friends to see what they&apos;re reading.
        </p>
      ) : (
        <div className="space-y-4">
          {activities.map((item) => (
            <ActivityCard
              key={item.id}
              item={item}
              reactions={getReactionsForItem(item)}
              commentCount={getCommentCount(item)}
              onToggleReaction={(emoji) => handleToggleReaction(item, emoji)}
            />
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

      {/* Compose post modal */}
      {showCompose && (
        <PostComposeModal
          onClose={() => setShowCompose(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
}

function ActivityCard({
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
    if (!showComments) {
      loadComments();
    }
    setShowComments(!showComments);
  }

  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-border-subtle">
      {/* Card content */}
      <div className="flex gap-4 bg-bg-medium p-4">
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
              <UserAvatar url={item.avatar_url} name={item.display_name} size={32} badgeType={item.badge_type} />
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

          {/* Activity text + rating badge */}
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

          {/* Post text */}
          {isPost && item.status_message && (
            <p className="text-sm whitespace-pre-line">{item.status_message}</p>
          )}

          {/* Review excerpt */}
          {item.review && (
            <p className="mt-1 line-clamp-2 text-sm text-text-muted italic">
              &ldquo;{item.review}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Engagement bar */}
      <div className="flex items-center gap-2 border-t border-border-subtle bg-[#2a2a2a] px-3 py-2">
        {/* Reaction pills */}
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

        {/* Add reaction */}
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

        {/* Comment button */}
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
                  <UserAvatar
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

          {/* Add comment */}
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
        "id, requester_id, addressee_id, status, requester_profile:profiles!friendships_requester_id_fkey(id, display_name, avatar_url, badge_type, username), addressee_profile:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url, badge_type, username)"
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
          badge_type: otherProfile?.badge_type ?? null,
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
          badge_type: otherProfile?.badge_type ?? null,
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
                <UserAvatar
                  url={friend.avatar_url}
                  name={friend.display_name}
                  size={80}
                  badgeType={friend.badge_type}
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
                <UserAvatar url={req.avatar_url} name={req.display_name} size={44} badgeType={req.badge_type} />
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
                <UserAvatar url={req.avatar_url} name={req.display_name} size={44} badgeType={req.badge_type} />
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
//  POST COMPOSE MODAL (#46)
// ══════════════════════════════════════════════════════════════

function PostComposeModal({
  onClose,
  onPostCreated,
}: {
  onClose: () => void;
  onPostCreated: () => void;
}) {
  const { user } = useAuth();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<
    "public" | "friends_only" | "private"
  >("friends_only");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const MAX_LENGTH = 2000;
  const MAX_IMAGES = 4;

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const available = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, available);

    setImages((prev) => [...prev, ...toAdd]);
    setImagePreviews((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ]);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!text.trim() && images.length === 0) return;
    if (!user) return;
    setError("");
    setPosting(true);

    // Upload images
    const imageUrls: string[] = [];
    for (const img of images) {
      const ext = img.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/post_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, img, { contentType: img.type, upsert: true });

      if (uploadError) {
        setError("Failed to upload image.");
        setPosting(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("post-images").getPublicUrl(path);
      imageUrls.push(publicUrl);
    }

    const { error: rpcError } = await supabase.rpc("create_post", {
      p_text_content: text.trim(),
      p_image_urls: imageUrls,
      p_mentions: [],
      p_tagged_books: [],
      p_visibility: visibility,
      p_quoted_activity_user_id: null,
      p_quoted_activity_isbn13: null,
      p_quoted_activity_type: null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setPosting(false);
      return;
    }

    setPosting(false);
    onPostCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-20">
      <div className="w-full max-w-lg rounded-(--radius-card) bg-bg-light p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">New post</h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-full p-1.5 transition-colors hover:bg-bg-medium"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="What's on your mind?"
          rows={5}
          className="mb-2 w-full resize-none rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-3 font-serif outline-none transition-colors placeholder:text-text-subtle focus:border-accent"
          autoFocus
        />

        {/* Image previews */}
        {imagePreviews.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {imagePreviews.map((url, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1 -right-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-error text-[10px] text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add photos button */}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mb-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-(--radius-input) border-[1.5px] border-accent px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/5"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
            Add Photos
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />

        <div className="mb-4 flex items-center justify-between">
          <span
            className={`text-xs ${text.length > MAX_LENGTH * 0.9 ? "text-error" : "text-text-subtle"}`}
          >
            {text.length}/{MAX_LENGTH}
          </span>

          {/* Visibility selector */}
          <div className="flex gap-1">
            {(
              [
                { value: "public", label: "Public" },
                { value: "friends_only", label: "Friends" },
                { value: "private", label: "Private" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVisibility(opt.value)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  visibility === opt.value
                    ? "bg-accent text-white"
                    : "bg-bg-medium text-text-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-error">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!text.trim() || posting}
          className="w-full cursor-pointer rounded-(--radius-input) bg-accent px-6 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
        >
          {posting ? "Posting..." : "Post"}
        </button>
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
                <UserAvatar url={r.avatar_url} name={r.display_name} size={40} badgeType={r.badge_type} />
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
                  <UserAvatar url={s.avatar_url} name={s.display_name} size={40} badgeType={s.badge_type} />
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
