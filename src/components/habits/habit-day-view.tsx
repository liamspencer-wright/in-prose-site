"use client";

import { useState } from "react";
import { HabitDayBox } from "./habit-day-box";
import {
  formatDateStr,
  parseDateStr,
  isFutureDate,
  isToday as isTodayFn,
} from "@/lib/habits";

interface HabitDayViewProps {
  completedDates: Set<string>;
  onToggleDay: (dateStr: string) => void;
}

export function HabitDayView({
  completedDates,
  onToggleDay,
}: HabitDayViewProps) {
  const [displayedDate, setDisplayedDate] = useState(new Date());

  const dateStr = formatDateStr(displayedDate);
  const isCompleted = completedDates.has(dateStr);
  const isFuture = isFutureDate(dateStr);
  const today = isTodayFn(dateStr);

  function navigate(delta: number) {
    const next = new Date(displayedDate);
    next.setDate(next.getDate() + delta);
    setDisplayedDate(next);
  }

  const dateLabel = today
    ? "Today"
    : isFuture
      ? "Future"
      : displayedDate.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "short",
        });

  const statusLabel = isFuture
    ? "Future"
    : isCompleted
      ? "Done"
      : "Tap to complete";

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="cursor-pointer p-1 text-text-muted transition-colors hover:text-text-primary"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        <span className="min-w-[140px] text-center text-sm font-semibold">
          {dateLabel}
        </span>
        <button
          type="button"
          onClick={() => navigate(1)}
          className="cursor-pointer p-1 text-text-muted transition-colors hover:text-text-primary"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>
      </div>

      {/* Day box */}
      <HabitDayBox
        label=""
        isCompleted={isCompleted}
        isToday={today}
        isFuture={isFuture}
        size="lg"
        onClick={() => !isFuture && onToggleDay(dateStr)}
      />

      {/* Status */}
      <span className="text-xs text-text-muted">{statusLabel}</span>
    </div>
  );
}
