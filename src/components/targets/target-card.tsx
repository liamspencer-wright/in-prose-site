"use client";

import { useState } from "react";
import {
  type ReadingTarget,
  getTargetTitle,
  getTargetSubtitle,
  getTargetStatus,
} from "@/lib/targets";

type HistoryEntry = { start: Date; end: Date; count: number };

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
  const isComplete = status === "completed";
  const isMissed = status === "missed";

  // Build segmented progress bar
  const segments = target.goal;
  const filledSegments = Math.min(progress, segments);

  // Past history entries (skip current period at index 0)
  const pastHistory = history.slice(1);

  return (
    <div
      className="cursor-pointer rounded-(--radius-card) bg-bg-medium p-5"
      onClick={onEdit}
    >
      {/* Header: star + title + trash */}
      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {/* Star icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFeatured();
            }}
            className="mt-0.5 flex-shrink-0 cursor-pointer text-text-muted transition-colors hover:text-accent"
            title={target.is_home_featured ? "Remove from home" : "Show on home"}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              {target.is_home_featured ? (
                <path
                  d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                  fill="currentColor"
                  className="text-accent"
                />
              ) : (
                <path
                  d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"
                  fill="currentColor"
                />
              )}
            </svg>
          </button>
          <div className="min-w-0">
            <h3 className="font-serif text-lg font-bold leading-tight">
              {title}
            </h3>
            <p className="mt-0.5 text-sm font-semibold text-accent">
              {subtitle}
            </p>
          </div>
        </div>
        {/* Trash icon */}
        {confirmDelete ? (
          <div
            className="flex flex-shrink-0 items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onDelete}
              className="cursor-pointer text-xs font-semibold text-error transition-colors hover:underline"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="cursor-pointer text-xs text-text-muted transition-colors hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            className="flex-shrink-0 cursor-pointer text-text-muted transition-colors hover:text-error"
            title="Delete target"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
        )}
      </div>

      {/* Target hit badge (completed) */}
      {isComplete && (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-500">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
          <div>
            <p className="font-serif font-bold">Target hit!</p>
            <p className="text-sm text-text-muted">
              {progress} {target.unit} &mdash; well done
            </p>
          </div>
        </div>
      )}

      {/* Segmented progress bar (not shown if complete) */}
      {!isComplete && (
        <div className="mt-3">
          <div className="flex gap-[3px]">
            {Array.from({ length: segments }).map((_, i) => {
              const isFilled = i < filledSegments;
              const barColor = isMissed
                ? "bg-error"
                : "bg-accent";
              return (
                <div
                  key={i}
                  className={`h-5 flex-1 first:rounded-l-md last:rounded-r-md ${
                    isFilled ? barColor : "bg-border"
                  }`}
                />
              );
            })}
          </div>
          <p className="mt-1.5 text-sm text-text-muted">
            {progress} / {target.goal}
          </p>
        </div>
      )}

      {/* Show history (rolling targets with past periods) */}
      {target.kind === "rolling" && pastHistory.length > 0 && (
        <>
          <div className="mt-3 border-t border-border-subtle pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowHistory(!showHistory);
              }}
              className="flex w-full cursor-pointer items-center justify-between py-1 text-sm font-semibold text-accent"
            >
              <span>{showHistory ? "Hide history" : "Show history"}</span>
              <svg
                viewBox="0 0 24 24"
                className={`h-5 w-5 fill-current transition-transform ${showHistory ? "rotate-180" : ""}`}
              >
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
              </svg>
            </button>
          </div>

          {showHistory && (
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
        </>
      )}
    </div>
  );
}
