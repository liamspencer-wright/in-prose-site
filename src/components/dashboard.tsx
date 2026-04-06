"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./auth-provider";
import Link from "next/link";
import {
  type ReadingTarget,
  computeProgress as sharedComputeProgress,
  computeHistory as sharedComputeHistory,
  getRollingWindowStart,
  addCalendarPeriod,
  formatPeriodLabel as sharedFormatPeriodLabel,
} from "@/lib/targets";

// ─── Types ──────────────────────────────────────────────────────────────────

type DashboardBook = {
  isbn13: string;
  title: string | null;
  first_author_name: string | null;
  cover_url: string | null;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  pages: number | null;
};

// ─── Dashboard ──────────────────────────────────────────────────────────────

export function Dashboard() {
  const { user } = useAuth();
  const supabase = createClient();

  const [tbrBooks, setTbrBooks] = useState<DashboardBook[]>([]);
  const [readingBooks, setReadingBooks] = useState<DashboardBook[]>([]);
  const [targets, setTargets] = useState<ReadingTarget[]>([]);
  const [finishedBooks, setFinishedBooks] = useState<DashboardBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const fields =
        "isbn13, title, first_author_name, cover_url, status, started_at, finished_at, pages";

      const [tbrResult, readingResult, finishedResult, targetsResult] =
        await Promise.all([
          supabase
            .from("user_books_expanded")
            .select(fields)
            .eq("status", "to_read")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("user_books_expanded")
            .select(fields)
            .eq("status", "reading")
            .order("started_at", { ascending: false }),
          supabase
            .from("user_books_expanded")
            .select(fields)
            .eq("status", "finished")
            .order("finished_at", { ascending: false }),
          supabase
            .from("reading_targets")
            .select("*")
            .eq("user_id", user!.id)
            .order("created_at", { ascending: false }),
        ]);

      setTbrBooks((tbrResult.data as DashboardBook[]) ?? []);
      setReadingBooks((readingResult.data as DashboardBook[]) ?? []);
      setFinishedBooks((finishedResult.data as DashboardBook[]) ?? []);
      setTargets((targetsResult.data as ReadingTarget[]) ?? []);
      setLoading(false);
    }

    load();
  }, [user, supabase]);

  async function updateBookStatus(isbn13: string, newStatus: string) {
    const now = new Date().toISOString();
    const update: Record<string, string | null> = { status: newStatus };

    if (newStatus === "reading") {
      update.started_at = now;
    } else if (newStatus === "finished" || newStatus === "dnf") {
      update.finished_at = now;
    }

    await supabase
      .from("user_books")
      .update(update)
      .eq("isbn13", isbn13)
      .eq("user_id", user!.id);

    // Refresh data
    const fields =
      "isbn13, title, first_author_name, cover_url, status, started_at, finished_at, pages";

    const [tbrResult, readingResult, finishedResult] = await Promise.all([
      supabase
        .from("user_books_expanded")
        .select(fields)
        .eq("status", "to_read")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("user_books_expanded")
        .select(fields)
        .eq("status", "reading")
        .order("started_at", { ascending: false }),
      supabase
        .from("user_books_expanded")
        .select(fields)
        .eq("status", "finished")
        .order("finished_at", { ascending: false }),
    ]);

    setTbrBooks((tbrResult.data as DashboardBook[]) ?? []);
    setReadingBooks((readingResult.data as DashboardBook[]) ?? []);
    setFinishedBooks((finishedResult.data as DashboardBook[]) ?? []);
  }

  async function deleteBook(isbn13: string) {
    await supabase
      .from("user_books")
      .delete()
      .eq("isbn13", isbn13)
      .eq("user_id", user!.id);

    setTbrBooks((prev) => prev.filter((b) => b.isbn13 !== isbn13));
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-12 max-sm:px-4">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-(--radius-card) bg-border"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 max-sm:px-4">
      <div className="space-y-6">
        <TbrSection
          books={tbrBooks}
          onStartReading={(isbn) => updateBookStatus(isbn, "reading")}
          onDelete={deleteBook}
        />
        <TargetsSection targets={targets} finishedBooks={finishedBooks} />
        <CurrentlyReadingSection books={readingBooks} />
      </div>
    </div>
  );
}

// ─── To Be Read Section ─────────────────────────────────────────────────────

function TbrSection({
  books,
  onStartReading,
  onDelete,
}: {
  books: DashboardBook[];
  onStartReading: (isbn: string) => void;
  onDelete: (isbn: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="overflow-hidden rounded-(--radius-card) bg-accent p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      <h2 className="mb-4 text-xl font-bold text-white">To be read</h2>

      {books.length === 0 ? (
        <p className="py-6 text-center text-white/70">
          <Link href="/search" className="underline hover:text-white">
            Search to add books to your TBR
          </Link>
        </p>
      ) : (
        <div
          ref={scrollRef}
          className="scrollbar-hide flex gap-3 overflow-x-auto pb-2"
        >
          {books.map((book) => (
            <TbrBookCard
              key={book.isbn13}
              book={book}
              onStartReading={() => onStartReading(book.isbn13)}
              onDelete={() => onDelete(book.isbn13)}
            />
          ))}

          {/* View more link at end of carousel */}
          <Link
            href="/library?status=to_read"
            className="flex h-[120px] w-[80px] flex-shrink-0 items-center justify-center rounded-lg bg-white/20 text-center text-xs font-semibold text-white transition-colors hover:bg-white/30"
          >
            View all &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

function TbrBookCard({
  book,
  onStartReading,
  onDelete,
}: {
  book: DashboardBook;
  onStartReading: () => void;
  onDelete: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setShowActions(!showActions)}
        className="cursor-pointer focus:outline-none"
      >
        {book.cover_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={book.cover_url}
            alt={book.title ?? ""}
            className="h-[120px] w-[80px] rounded-lg object-cover shadow-md"
          />
        ) : (
          <div className="flex h-[120px] w-[80px] items-center justify-center rounded-lg bg-white/20 p-2 text-center text-xs font-semibold text-white shadow-md">
            {book.title ?? "Unknown"}
          </div>
        )}
      </button>

      {showActions && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowActions(false)}
          />
          <div className="absolute top-0 left-0 z-20 flex flex-col gap-1 rounded-lg bg-white p-2 shadow-lg">
            <Link
              href={`/library/${book.isbn13}`}
              className="rounded px-3 py-1.5 text-left text-xs font-semibold text-text-primary hover:bg-bg-light"
            >
              View
            </Link>
            <button
              onClick={() => {
                onStartReading();
                setShowActions(false);
              }}
              className="cursor-pointer rounded px-3 py-1.5 text-left text-xs font-semibold text-accent hover:bg-bg-light"
            >
              Start reading
            </button>
            <button
              onClick={() => {
                onDelete();
                setShowActions(false);
              }}
              className="cursor-pointer rounded px-3 py-1.5 text-left text-xs font-semibold text-error hover:bg-bg-light"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Targets Section ────────────────────────────────────────────────────────

function TargetsSection({
  targets,
  finishedBooks,
}: {
  targets: ReadingTarget[];
  finishedBooks: DashboardBook[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (targets.length === 0) {
    return (
      <div className="rounded-(--radius-card) border border-border-subtle bg-bg-medium p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <h2 className="mb-3 text-xl font-bold">Reading targets</h2>
        <p className="py-4 text-center text-text-muted">
          Set a reading target in the app to track your progress here.
        </p>
      </div>
    );
  }

  const target = targets[activeIndex];

  return (
    <div className="rounded-(--radius-card) border border-border-subtle bg-bg-medium p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <h2 className="mb-4 text-xl font-bold">Reading targets</h2>

      <TargetCard target={target} finishedBooks={finishedBooks} />

      {targets.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {targets.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-2 w-2 cursor-pointer rounded-full transition-colors ${
                i === activeIndex ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TargetCard({
  target,
  finishedBooks,
}: {
  target: ReadingTarget;
  finishedBooks: DashboardBook[];
}) {
  const progress = computeProgress(target, finishedBooks);
  const pct = Math.min(100, (progress / target.goal) * 100);

  if (target.kind === "deadline") {
    return <DeadlineTargetCard target={target} progress={progress} pct={pct} />;
  }

  return (
    <RollingTargetCard
      target={target}
      progress={progress}
      pct={pct}
      finishedBooks={finishedBooks}
    />
  );
}

function DeadlineTargetCard({
  target,
  progress,
  pct,
}: {
  target: ReadingTarget;
  progress: number;
  pct: number;
}) {
  const daysRemaining = target.deadline_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(target.deadline_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const expectedPct = (() => {
    if (!target.deadline_at) return 0;
    const start = new Date(target.started_at).getTime();
    const end = new Date(target.deadline_at).getTime();
    const now = Date.now();
    const totalMs = end - start;
    if (totalMs <= 0) return 100;
    return Math.min(100, ((now - start) / totalMs) * 100);
  })();

  const pace: "ahead" | "on_target" | "behind" =
    pct >= expectedPct + 5
      ? "ahead"
      : pct >= expectedPct - 5
        ? "on_target"
        : "behind";

  const paceLabel = {
    ahead: "Ahead",
    on_target: "On target",
    behind: "Behind",
  }[pace];
  const paceColor = {
    ahead: "bg-green-100 text-green-700",
    on_target: "bg-orange-100 text-accent",
    behind: "bg-red-100 text-error",
  }[pace];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">
          {target.goal} {target.unit}
          {target.deadline_at &&
            ` by ${new Date(target.deadline_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${paceColor}`}
        >
          {paceLabel}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-4 overflow-hidden rounded-full bg-border">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
        {/* Expected position marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-text-primary/30"
          style={{ left: `${expectedPct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
        <span>
          {progress} / {target.goal} {target.unit}
        </span>
        {daysRemaining !== null && (
          <span>
            {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining
          </span>
        )}
      </div>
    </div>
  );
}

function RollingTargetCard({
  target,
  progress,
  pct,
  finishedBooks,
}: {
  target: ReadingTarget;
  progress: number;
  pct: number;
  finishedBooks: DashboardBook[];
}) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const history = computeHistory(target, finishedBooks);
  // Skip the first entry (current period) — that's shown in the ring
  const pastHistory = history.slice(1, 7);

  const maxCount = Math.max(
    target.goal,
    ...pastHistory.map((h) => h.count)
  );
  const cadenceLabel = target.cadence_unit ?? "period";

  // Reverse so oldest is on the left
  const displayHistory = pastHistory.slice().reverse();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">
          {target.goal} {target.unit} per {cadenceLabel}
        </span>
        <span className="text-xs text-text-muted">
          {progress} / {target.goal} this {cadenceLabel}
        </span>
      </div>

      {displayHistory.length > 0 ? (
        /* Horizontal layout: bar chart left, circular progress right */
        <div className="flex items-center gap-4 max-sm:flex-col max-sm:gap-3">
          {/* Bar chart */}
          <div className="flex-1">
            <div className="relative flex items-end gap-1.5" style={{ height: "100px" }}>
              {displayHistory.map((h, i) => {
                const barHeight =
                  maxCount > 0
                    ? Math.max(4, (h.count / maxCount) * 100)
                    : 4;
                const meetsGoal = h.count >= target.goal;
                const isHovered = hoveredBar === i;
                return (
                  <div
                    key={i}
                    className="relative flex-1"
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "flex-end",
                    }}
                    onMouseEnter={() => setHoveredBar(i)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        meetsGoal ? "bg-green-400" : "bg-accent/60"
                      } ${isHovered ? "opacity-80" : ""}`}
                      style={{ height: `${barHeight}%` }}
                    />
                    {/* Hover tooltip */}
                    {isHovered && (
                      <div className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-text-primary px-2 py-1 text-[10px] font-bold text-white shadow">
                        {h.count} {target.unit}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Goal line */}
              {maxCount > 0 && (
                <div
                  className="pointer-events-none absolute right-0 left-0 border-t border-dashed border-text-muted/40"
                  style={{
                    bottom: `${(target.goal / maxCount) * 100}%`,
                  }}
                />
              )}
            </div>

            {/* X-axis labels */}
            <div className="mt-1 flex gap-1.5">
              {displayHistory.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 text-center text-[9px] text-text-subtle"
                >
                  {formatPeriodLabel(h.start, target.cadence_unit)}
                </div>
              ))}
            </div>
          </div>

          {/* Circular progress for current period */}
          <div className="flex flex-shrink-0 flex-col items-center">
            <CircularProgress pct={pct} size={80}>
              <span className="text-lg font-bold">{progress}</span>
              <span className="text-[10px] text-text-muted">/ {target.goal}</span>
            </CircularProgress>
            <span className="mt-1 text-[10px] text-text-subtle">
              This {cadenceLabel}
            </span>
          </div>
        </div>
      ) : (
        /* No history yet — show a simple progress bar like deadline targets */
        <div>
          <div className="relative h-4 overflow-hidden rounded-full bg-border">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
            <span>
              {progress} / {target.goal} {target.unit}
            </span>
            <span>This {cadenceLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatPeriodLabel(date: Date, cadenceUnit: string | null): string {
  return sharedFormatPeriodLabel(date, cadenceUnit);
}

function CircularProgress({
  pct,
  size,
  children,
}: {
  pct: number;
  size: number;
  children: React.ReactNode;
}) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, pct) / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ─── Currently Reading Section ──────────────────────────────────────────────

function CurrentlyReadingSection({
  books,
}: {
  books: DashboardBook[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (books.length === 0) {
    return (
      <div className="overflow-hidden rounded-(--radius-card) bg-accent p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <h2 className="mb-2 text-xl font-bold text-white">
          Currently reading
        </h2>
        <p className="py-6 text-center text-white/70">
          Check your TBR and pick a new book
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <CurrentlyReadingCard book={books[activeIndex]} />

      {books.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {books.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-2 w-2 cursor-pointer rounded-full transition-colors ${
                i === activeIndex ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CurrentlyReadingCard({
  book,
}: {
  book: DashboardBook;
}) {
  const daysReading = book.started_at
    ? Math.max(
        1,
        Math.ceil(
          (Date.now() - new Date(book.started_at).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const startedLabel = book.started_at
    ? new Date(book.started_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex overflow-hidden rounded-(--radius-card) shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      {/* Left: blurred cover background */}
      <div className="relative flex w-[140px] flex-shrink-0 items-center justify-center overflow-hidden py-5 max-sm:w-[110px]">
        {book.cover_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={book.cover_url}
            alt=""
            className="absolute inset-0 h-full w-full scale-150 object-cover blur-xl"
          />
        )}
        <div className="absolute inset-0 bg-black/15" />
        <Link href={`/library/${book.isbn13}`} className="relative z-10">
          {book.cover_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={book.cover_url}
              alt={book.title ?? ""}
              className="h-[120px] w-[82px] rounded-lg object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-[120px] w-[82px] items-center justify-center rounded-lg bg-white/20 p-2 text-center text-xs font-semibold text-white shadow-lg">
              {book.title ?? "Unknown"}
            </div>
          )}
        </Link>
      </div>

      {/* Middle: orange background with label + info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 bg-accent px-5 py-5 max-sm:px-3">
        <span className="w-fit rounded bg-black/20 px-2.5 py-1 text-xs font-bold text-white">
          Currently reading
        </span>
        <Link
          href={`/library/${book.isbn13}`}
          className="text-xl font-bold text-white hover:underline max-sm:text-lg"
        >
          {book.title ?? "Unknown Title"}
        </Link>
        <span className="text-sm text-white/80">
          {book.first_author_name ?? "Unknown Author"}
        </span>
        {startedLabel && (
          <span className="text-sm text-white/70">
            Started {startedLabel}
            {daysReading &&
              ` \u00b7 ${daysReading} ${daysReading === 1 ? "day" : "days"}`}
          </span>
        )}
      </div>

      {/* Right: action buttons (DNF top, Finish bottom — matching app) */}
      <div className="flex w-[60px] flex-shrink-0 flex-col">
        <Link
          href={`/library/${book.isbn13}?tab=edit&status=dnf`}
          className="flex flex-1 items-center justify-center bg-error transition-opacity hover:opacity-80"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </Link>
        <Link
          href={`/library/${book.isbn13}?tab=edit&status=finished`}
          className="flex flex-1 items-center justify-center bg-green-600 transition-opacity hover:opacity-80"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ─── Progress computation (delegates to shared module) ──────────────────────

function computeProgress(
  target: ReadingTarget,
  finishedBooks: DashboardBook[]
): number {
  return sharedComputeProgress(target, finishedBooks);
}

function computeHistory(
  target: ReadingTarget,
  finishedBooks: DashboardBook[]
): { start: Date; end: Date; count: number }[] {
  return sharedComputeHistory(target, finishedBooks);
}
