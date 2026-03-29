"use client";

import { useState } from "react";
import {
  type ReadingTarget,
  type TargetStatus,
  getTargetTitle,
  getTargetSubtitle,
  getTargetStatus,
  segmentStep,
  formatPeriodLabel,
} from "@/lib/targets";

type HistoryEntry = { start: Date; end: Date; count: number };

const STATUS_BADGE: Record<TargetStatus, { label: string; classes: string }> = {
  active: { label: "Active", classes: "bg-accent/15 text-accent" },
  completed: { label: "Completed", classes: "bg-green-100 text-green-700" },
  missed: { label: "Missed", classes: "bg-red-100 text-error" },
};

export function TargetCard({
  target,
  progress,
  history,
  onEdit,
  onDelete,
  onToggleFeatured,
}: {
  target: ReadingTarget;
  progress: number;
  history: HistoryEntry[];
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const status = getTargetStatus(target, progress);
  const title = getTargetTitle(target);
  const subtitle = getTargetSubtitle(target, progress);
  const badge = STATUS_BADGE[status];
  const pct = Math.min(100, (progress / Math.max(1, target.goal)) * 100);

  const barColor =
    status === "completed"
      ? "bg-green-500"
      : status === "missed"
        ? "bg-error"
        : "bg-accent";

  const step = segmentStep(target.goal, target.unit);
  const ticks: number[] = [];
  for (let i = step; i < target.goal; i += step) {
    ticks.push((i / target.goal) * 100);
  }

  // Deadline pace marker
  const expectedPct =
    target.kind === "deadline" && target.deadline_at
      ? (() => {
          const start = new Date(target.started_at).getTime();
          const end = new Date(target.deadline_at).getTime();
          const now = Date.now();
          const total = end - start;
          if (total <= 0) return 100;
          return Math.min(100, ((now - start) / total) * 100);
        })()
      : null;

  // Past history entries (skip current period at index 0)
  const pastHistory = history.slice(1);

  return (
    <div className="rounded-(--radius-card) border border-border-subtle bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
      {/* Header: title + badge + actions */}
      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-tight">{title}</h3>
          <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {target.is_home_featured && (
            <span className="text-accent" title="Featured">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badge.classes}`}
          >
            {badge.label}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 mb-2">
        <div className="relative h-4 overflow-hidden rounded-full bg-border">
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${barColor} transition-all`}
            style={{ width: `${pct}%` }}
          />
          {/* Tick marks */}
          {ticks.map((pos) => (
            <div
              key={pos}
              className="absolute top-0 h-full w-px bg-white/50"
              style={{ left: `${pos}%` }}
            />
          ))}
          {/* Expected position marker (deadline only) */}
          {expectedPct !== null && status === "active" && (
            <div
              className="absolute top-0 h-full w-0.5 bg-text-primary/30"
              style={{ left: `${expectedPct}%` }}
            />
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-text-muted">
          <span>
            {progress} / {target.goal} {target.unit}
          </span>
          {target.is_private && (
            <span className="text-text-subtle" title="Private">
              <svg viewBox="0 0 24 24" className="inline h-3.5 w-3.5 fill-current">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* Rolling history toggle */}
      {target.kind === "rolling" && pastHistory.length > 0 && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="mt-2 flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-bg-light"
        >
          <span>
            Previous periods ({pastHistory.length})
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 fill-current transition-transform ${showHistory ? "rotate-180" : ""}`}
          >
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
          </svg>
        </button>
      )}

      {/* History entries */}
      {showHistory && pastHistory.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {pastHistory.map((h, i) => {
            const hPct = Math.min(
              100,
              (h.count / Math.max(1, target.goal)) * 100
            );
            const met = h.count >= target.goal;
            const startLabel = h.start.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            });
            const endLabel = h.end.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            return (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="w-[130px] flex-shrink-0 text-text-subtle">
                  {startLabel} &ndash; {endLabel}
                </span>
                <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-border">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all ${met ? "bg-green-400" : "bg-error/60"}`}
                    style={{ width: `${hPct}%` }}
                  />
                </div>
                <span
                  className={`w-[60px] flex-shrink-0 text-right font-semibold ${met ? "text-green-700" : "text-error"}`}
                >
                  {h.count}/{target.goal}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-border-subtle pt-3">
        <button
          onClick={onEdit}
          className="cursor-pointer rounded-(--radius-input) bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-88"
        >
          Edit
        </button>
        <button
          onClick={onToggleFeatured}
          className="cursor-pointer rounded-(--radius-input) border border-border px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:bg-bg-light"
        >
          {target.is_home_featured ? "Unfeature" : "Feature"}
        </button>
        <div className="flex-1" />
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-error">Delete?</span>
            <button
              onClick={onDelete}
              className="cursor-pointer rounded px-2 py-1 text-xs font-semibold text-error transition-colors hover:bg-error/10"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="cursor-pointer rounded px-2 py-1 text-xs text-text-muted transition-colors hover:bg-bg-light"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="cursor-pointer text-xs text-text-subtle transition-colors hover:text-error"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
