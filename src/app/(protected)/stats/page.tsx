"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import {
  type ReadingTarget,
  type FinishedBook,
  computeProgress,
  computeHistory,
  getTargetStatus,
} from "@/lib/targets";
import { TargetCard } from "@/components/targets/target-card";
import { TargetFormModal } from "@/components/targets/target-form";

type StatusFilter = "all" | "active" | "completed" | "missed";
type TypeFilter = "all" | "books" | "pages";
type CadenceFilter = "all" | "deadline" | "rolling";
type SortBy = "recent" | "oldest" | "deadline" | "progress";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All",
  active: "Active",
  completed: "Completed",
  missed: "Missed",
};

const TYPE_LABELS: Record<TypeFilter, string> = {
  all: "All",
  books: "Books",
  pages: "Pages",
};

const CADENCE_LABELS: Record<CadenceFilter, string> = {
  all: "All",
  deadline: "One-time",
  rolling: "Rolling",
};

const SORT_LABELS: Record<SortBy, string> = {
  recent: "Newest",
  oldest: "Oldest",
  deadline: "Deadline",
  progress: "Progress",
};

export default function StatsPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [targets, setTargets] = useState<ReadingTarget[]>([]);
  const [finishedBooks, setFinishedBooks] = useState<FinishedBook[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [cadenceFilter, setCadenceFilter] = useState<CadenceFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editingTarget, setEditingTarget] = useState<ReadingTarget | null>(
    null
  );

  const load = useCallback(async () => {
    if (!user) return;

    const [targetsResult, booksResult] = await Promise.all([
      supabase
        .from("reading_targets")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("user_books_expanded")
        .select("finished_at, pages")
        .eq("status", "finished"),
    ]);

    setTargets((targetsResult.data as ReadingTarget[]) ?? []);
    setFinishedBooks((booksResult.data as FinishedBook[]) ?? []);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // Compute progress and history for all targets
  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of targets) {
      map[t.id] = computeProgress(t, finishedBooks);
    }
    return map;
  }, [targets, finishedBooks]);

  const historyMap = useMemo(() => {
    const map: Record<
      string,
      { start: Date; end: Date; count: number }[]
    > = {};
    for (const t of targets) {
      map[t.id] = computeHistory(t, finishedBooks);
    }
    return map;
  }, [targets, finishedBooks]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = targets;

    if (statusFilter !== "all") {
      result = result.filter(
        (t) => getTargetStatus(t, progressMap[t.id] ?? 0) === statusFilter
      );
    }

    if (typeFilter !== "all") {
      result = result.filter((t) => t.unit === typeFilter);
    }

    if (cadenceFilter !== "all") {
      result = result.filter((t) => t.kind === cadenceFilter);
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
        case "oldest":
          return (
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
          );
        case "deadline": {
          const aDeadline = a.deadline_at
            ? new Date(a.deadline_at).getTime()
            : Infinity;
          const bDeadline = b.deadline_at
            ? new Date(b.deadline_at).getTime()
            : Infinity;
          return aDeadline - bDeadline;
        }
        case "progress": {
          const aPct =
            (progressMap[a.id] ?? 0) / Math.max(1, a.goal);
          const bPct =
            (progressMap[b.id] ?? 0) / Math.max(1, b.goal);
          return bPct - aPct;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [targets, statusFilter, typeFilter, cadenceFilter, sortBy, progressMap]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: targets.length,
      active: 0,
      completed: 0,
      missed: 0,
    };
    for (const t of targets) {
      const s = getTargetStatus(t, progressMap[t.id] ?? 0);
      counts[s]++;
    }
    return counts;
  }, [targets, progressMap]);

  // CRUD handlers
  async function handleSave(
    data: Omit<ReadingTarget, "id" | "user_id" | "created_at">,
    id?: string
  ) {
    if (!user) return;

    // If setting featured, clear other featured targets first
    if (data.is_home_featured) {
      await supabase
        .from("reading_targets")
        .update({ is_home_featured: false })
        .eq("user_id", user.id)
        .eq("is_home_featured", true);
    }

    if (id) {
      await supabase.from("reading_targets").update(data).eq("id", id);
    } else {
      await supabase
        .from("reading_targets")
        .insert({ ...data, user_id: user.id });
    }

    setShowForm(false);
    setEditingTarget(null);
    await load();
  }

  async function handleDelete(targetId: string) {
    await supabase.from("reading_targets").delete().eq("id", targetId);
    setTargets((prev) => prev.filter((t) => t.id !== targetId));
  }

  async function handleToggleFeatured(target: ReadingTarget) {
    if (!user) return;

    if (!target.is_home_featured) {
      // Clear all other featured
      await supabase
        .from("reading_targets")
        .update({ is_home_featured: false })
        .eq("user_id", user.id)
        .eq("is_home_featured", true);
    }

    await supabase
      .from("reading_targets")
      .update({ is_home_featured: !target.is_home_featured })
      .eq("id", target.id);

    await load();
  }

  function openEdit(target: ReadingTarget) {
    setEditingTarget(target);
    setShowForm(true);
  }

  function openCreate() {
    setEditingTarget(null);
    setShowForm(true);
  }

  const hasActiveFilters =
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    cadenceFilter !== "all";

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pt-4 pb-12 max-sm:px-4">
      <h1 className="mb-6 text-3xl font-bold">Reading targets</h1>

      {/* Filters */}
      <div className="mb-3 space-y-2">
        {/* Status filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                statusFilter === s
                  ? "bg-accent text-white"
                  : "bg-bg-medium text-text-muted hover:bg-accent/10"
              }`}
            >
              {STATUS_LABELS[s]}
              {statusCounts[s] > 0 && (
                <span className="ml-1 opacity-70">({statusCounts[s]})</span>
              )}
            </button>
          ))}
        </div>

        {/* Type + Cadence filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-subtle">Type:</span>
            {(Object.keys(TYPE_LABELS) as TypeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  typeFilter === t
                    ? "bg-accent text-white"
                    : "bg-bg-medium text-text-muted hover:bg-accent/10"
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-subtle">Cadence:</span>
            {(Object.keys(CADENCE_LABELS) as CadenceFilter[]).map((c) => (
              <button
                key={c}
                onClick={() => setCadenceFilter(c)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  cadenceFilter === c
                    ? "bg-accent text-white"
                    : "bg-bg-medium text-text-muted hover:bg-accent/10"
                }`}
              >
                {CADENCE_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sort */}
      <div className="mb-6 flex items-center gap-2 text-sm text-text-muted">
        <span>Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="cursor-pointer rounded border border-border bg-bg-light px-2 py-1 font-serif outline-none"
        >
          {(Object.keys(SORT_LABELS) as SortBy[]).map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Target list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-(--radius-card) bg-border"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-text-muted">
            {targets.length === 0
              ? "No reading targets yet."
              : "No targets match your filters."}
          </p>
          {targets.length === 0 && (
            <button
              onClick={openCreate}
              className="mt-4 cursor-pointer rounded-(--radius-input) bg-accent px-6 py-2.5 font-serif font-bold text-white transition-opacity hover:opacity-88"
            >
              Create your first target
            </button>
          )}
          {hasActiveFilters && targets.length > 0 && (
            <button
              onClick={() => {
                setStatusFilter("all");
                setTypeFilter("all");
                setCadenceFilter("all");
              }}
              className="mt-4 cursor-pointer text-sm text-accent hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((target) => (
            <TargetCard
              key={target.id}
              target={target}
              progress={progressMap[target.id] ?? 0}
              history={historyMap[target.id] ?? []}
              onEdit={() => openEdit(target)}
              onDelete={() => handleDelete(target.id)}
              onToggleFeatured={() => handleToggleFeatured(target)}
            />
          ))}
        </div>
      )}

      {/* FAB */}
      {!loading && targets.length > 0 && (
        <button
          onClick={openCreate}
          className="fixed right-8 bottom-8 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform hover:scale-105 max-sm:right-5 max-sm:bottom-5"
          title="New target"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>
      )}

      {/* Form modal */}
      {showForm && (
        <TargetFormModal
          existing={editingTarget}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingTarget(null);
          }}
        />
      )}
    </div>
  );
}
