"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./auth-provider";
import Link from "next/link";

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

type ReadingTarget = {
  id: string;
  kind: "deadline" | "rolling";
  unit: "books" | "pages";
  goal: number;
  started_at: string;
  deadline_at: string | null;
  cadence_unit: string | null;
  cadence_value: number;
  is_home_featured: boolean;
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

  async function updateBookStatus(
    isbn13: string,
    newStatus: string
  ) {
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
        <CurrentlyReadingSection
          books={readingBooks}
          onFinish={(isbn) => updateBookStatus(isbn, "finished")}
          onDnf={(isbn) => updateBookStatus(isbn, "dnf")}
        />
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
    pct >= expectedPct + 5 ? "ahead" : pct >= expectedPct - 5 ? "on_target" : "behind";

  const paceLabel = { ahead: "Ahead", on_target: "On target", behind: "Behind" }[pace];
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
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${paceColor}`}>
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
  const history = computeHistory(target, finishedBooks);
  const recentHistory = history.slice(0, 6);

  const maxCount = Math.max(target.goal, ...recentHistory.map((h) => h.count));
  const cadenceLabel = target.cadence_unit ?? "period";

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

      {/* Bar chart of recent periods */}
      {recentHistory.length > 1 && (
        <div className="mb-3 flex items-end gap-1.5" style={{ height: "80px" }}>
          {recentHistory
            .slice()
            .reverse()
            .map((h, i) => {
              const barHeight =
                maxCount > 0 ? Math.max(4, (h.count / maxCount) * 100) : 4;
              const meetsGoal = h.count >= target.goal;
              return (
                <div
                  key={i}
                  className="flex-1"
                  style={{ height: "100%", display: "flex", alignItems: "flex-end" }}
                >
                  <div
                    className={`w-full rounded-t transition-all ${
                      meetsGoal ? "bg-green-400" : "bg-accent/60"
                    }`}
                    style={{ height: `${barHeight}%` }}
                    title={`${h.count} ${target.unit}`}
                  />
                </div>
              );
            })}
          {/* Goal line */}
        </div>
      )}

      {/* Circular progress for current period */}
      <div className="flex items-center justify-center">
        <CircularProgress pct={pct} size={80}>
          <span className="text-lg font-bold">{progress}</span>
          <span className="text-[10px] text-text-muted">/ {target.goal}</span>
        </CircularProgress>
      </div>
    </div>
  );
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
  onFinish,
  onDnf,
}: {
  books: DashboardBook[];
  onFinish: (isbn: string) => void;
  onDnf: (isbn: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="overflow-hidden rounded-(--radius-card) bg-accent p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      <h2 className="mb-4 text-xl font-bold text-white">Currently reading</h2>

      {books.length === 0 ? (
        <p className="py-6 text-center text-white/70">
          Check your TBR and pick a new book
        </p>
      ) : (
        <>
          <CurrentlyReadingCard
            book={books[activeIndex]}
            onFinish={() => onFinish(books[activeIndex].isbn13)}
            onDnf={() => onDnf(books[activeIndex].isbn13)}
          />

          {books.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5">
              {books.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`h-2 w-2 cursor-pointer rounded-full transition-colors ${
                    i === activeIndex ? "bg-white" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CurrentlyReadingCard({
  book,
  onFinish,
  onDnf,
}: {
  book: DashboardBook;
  onFinish: () => void;
  onDnf: () => void;
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
      })
    : null;

  return (
    <div className="flex items-center gap-4 rounded-xl bg-white/10 p-4">
      {/* Cover */}
      <Link href={`/library/${book.isbn13}`} className="flex-shrink-0">
        {book.cover_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={book.cover_url}
            alt={book.title ?? ""}
            className="h-[100px] w-[68px] rounded-lg object-cover shadow-md"
          />
        ) : (
          <div className="flex h-[100px] w-[68px] items-center justify-center rounded-lg bg-white/20 p-2 text-center text-xs font-semibold text-white shadow-md">
            {book.title ?? "Unknown"}
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={`/library/${book.isbn13}`}
          className="truncate text-sm font-bold text-white hover:underline"
        >
          {book.title ?? "Unknown Title"}
        </Link>
        <span className="truncate text-xs text-white/70">
          {book.first_author_name ?? "Unknown Author"}
        </span>
        {startedLabel && (
          <span className="text-xs text-white/60">
            Started {startedLabel}
            {daysReading && ` \u00b7 ${daysReading} ${daysReading === 1 ? "day" : "days"}`}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 flex-col gap-2">
        <button
          onClick={onFinish}
          className="cursor-pointer rounded-lg bg-green-500 px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-80"
        >
          Finish
        </button>
        <button
          onClick={onDnf}
          className="cursor-pointer rounded-lg bg-error px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-80"
        >
          DNF
        </button>
      </div>
    </div>
  );
}

// ─── Progress computation ───────────────────────────────────────────────────

function computeProgress(
  target: ReadingTarget,
  finishedBooks: DashboardBook[]
): number {
  const qualifying = finishedBooks.filter((b) => {
    if (!b.finished_at) return false;
    const finishedAt = new Date(b.finished_at);

    if (target.kind === "deadline") {
      if (!target.deadline_at) return false;
      return (
        finishedAt >= new Date(target.started_at) &&
        finishedAt <= new Date(target.deadline_at)
      );
    }

    // Rolling: current window
    const windowStart = getRollingWindowStart(target);
    return windowStart ? finishedAt >= windowStart : false;
  });

  if (target.unit === "pages") {
    return qualifying.reduce((sum, b) => sum + (b.pages ?? 0), 0);
  }
  return qualifying.length;
}

function computeHistory(
  target: ReadingTarget,
  finishedBooks: DashboardBook[]
): { start: Date; end: Date; count: number }[] {
  if (target.kind !== "rolling" || !target.cadence_unit) return [];

  const now = new Date();
  const startedAt = new Date(target.started_at);
  const windows: { start: Date; end: Date }[] = [];

  let windowStart = new Date(startedAt);
  while (windowStart < now) {
    const nextStart = addPeriod(
      windowStart,
      target.cadence_unit,
      target.cadence_value
    );
    if (nextStart <= now) {
      windows.push({ start: new Date(windowStart), end: nextStart });
    } else {
      windows.push({ start: new Date(windowStart), end: now });
    }
    windowStart = nextStart;
  }

  if (windows.length === 0) {
    windows.push({ start: startedAt, end: now });
  }

  return windows.reverse().map((w) => {
    const qualifying = finishedBooks.filter((b) => {
      if (!b.finished_at) return false;
      const d = new Date(b.finished_at);
      return d >= w.start && d <= w.end;
    });
    const count =
      target.unit === "pages"
        ? qualifying.reduce((sum, b) => sum + (b.pages ?? 0), 0)
        : qualifying.length;
    return { ...w, count };
  });
}

function getRollingWindowStart(target: ReadingTarget): Date | null {
  if (target.kind !== "rolling" || !target.cadence_unit) return null;
  const now = new Date();
  return addPeriod(now, target.cadence_unit, -target.cadence_value);
}

function addPeriod(
  date: Date,
  unit: string,
  value: number
): Date {
  const result = new Date(date);
  switch (unit) {
    case "day":
      result.setDate(result.getDate() + value);
      break;
    case "week":
      result.setDate(result.getDate() + value * 7);
      break;
    case "month":
      result.setMonth(result.getMonth() + value);
      break;
    case "year":
      result.setFullYear(result.getFullYear() + value);
      break;
  }
  return result;
}
