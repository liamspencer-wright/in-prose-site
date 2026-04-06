"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import UserAvatar from "@/components/user-avatar";

type ActivityItem = {
  id: string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  badge_type: string | null;
  isbn13: string;
  title: string;
  cover_url: string | null;
  activity_type: string;
  rating: number | null;
  review: string | null;
  activity_at: string;
};

type ActivityFilter = "all" | "started" | "finished" | "reviewed";

const FILTER_LABELS: Record<ActivityFilter, string> = {
  all: "All",
  started: "Started",
  finished: "Finished",
  reviewed: "Reviewed",
};

const PAGE_SIZE = 20;

export default function FeedPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [hasMore, setHasMore] = useState(true);

  const loadFeed = useCallback(
    async (offset = 0, append = false) => {
      if (!user) return;
      const supabase = createClient();

      const activityType = filter === "all" ? null : filter;
      const { data } = await supabase.rpc("get_friends_activity_feed", {
        activity_type: activityType,
        lim: PAGE_SIZE,
        off: offset,
      });

      const results = (data as ActivityItem[]) ?? [];

      if (append) {
        setItems((prev) => [...prev, ...results]);
      } else {
        setItems(results);
      }

      setHasMore(results.length === PAGE_SIZE);
      setLoading(false);
      setLoadingMore(false);
    },
    [user, filter]
  );

  useEffect(() => {
    setLoading(true);
    setItems([]);
    loadFeed(0, false);
  }, [loadFeed]);

  function handleLoadMore() {
    setLoadingMore(true);
    loadFeed(items.length, true);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 pt-4 pb-12 max-sm:px-4">
      <h1 className="mb-6 text-3xl font-bold">Activity feed</h1>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as ActivityFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === f
                ? "bg-accent text-white"
                : "bg-bg-medium text-text-muted hover:bg-accent/10"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-12 text-center text-text-muted">Loading feed...</p>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-text-muted">
          No activity yet. Add some friends to see what they&apos;re reading!
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ActivityCard key={item.id} item={item} />
          ))}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mt-4 w-full cursor-pointer rounded-(--radius-input) border border-border py-3 text-sm font-semibold text-text-muted transition-colors hover:bg-bg-medium disabled:opacity-55"
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
  const actionText = {
    started: "started reading",
    finished: "finished",
    reviewed: "reviewed",
  }[item.activity_type] ?? item.activity_type;

  const timeAgo = formatTimeAgo(item.activity_at);

  return (
    <div className="rounded-(--radius-card) border border-border-subtle bg-bg-medium p-4">
      {/* User info */}
      <div className="mb-3 flex items-center gap-2">
        <Link href={`/friends/${item.user_id}`}>
          <UserAvatar url={item.avatar_url} name={item.display_name} size={32} badgeType={item.badge_type} />
        </Link>
        <div className="flex-1">
          <p className="text-sm">
            <Link
              href={`/friends/${item.user_id}`}
              className="font-semibold hover:underline"
            >
              {item.display_name}
            </Link>{" "}
            <span className="text-text-muted">{actionText}</span>
          </p>
          <p className="text-xs text-text-subtle">{timeAgo}</p>
        </div>
      </div>

      {/* Book info */}
      <div className="flex gap-3">
        <div className="h-[72px] w-[48px] flex-shrink-0 overflow-hidden rounded bg-bg-light shadow-[0_1px_4px_rgba(0,0,0,0.12)]">
          {item.cover_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.cover_url}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[8px] text-text-subtle">
              No cover
            </div>
          )}
        </div>
        <div>
          <p className="font-semibold leading-tight">{item.title}</p>
          {item.rating !== null && (
            <p className="mt-0.5 flex items-center gap-0.5 text-sm text-accent">
              ★ {Number(item.rating).toFixed(1)}
            </p>
          )}
          {item.review && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-muted">
              {item.review}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
