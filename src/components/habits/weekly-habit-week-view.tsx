"use client";

import { useState } from "react";
import { HabitDayBox } from "./habit-day-box";
import {
  formatDateStr,
  startOfWeek,
  weekRangeLabel,
  isFutureDate,
} from "@/lib/habits";

interface WeeklyHabitWeekViewProps {
  completedDates: Set<string>;
  onToggleDay: (dateStr: string) => void;
}

export function WeeklyHabitWeekView({
  completedDates,
  onToggleDay,
}: WeeklyHabitWeekViewProps) {
  const [displayedWeekStart, setDisplayedWeekStart] = useState(
    () => startOfWeek(new Date())
  );

  const mondayStr = formatDateStr(displayedWeekStart);
  const isCompleted = completedDates.has(mondayStr);
  const isFuture = isFutureDate(mondayStr);
  const currentWeekMonday = formatDateStr(startOfWeek(new Date()));
  const isCurrentWeek = mondayStr === currentWeekMonday;

  function navigate(delta: number) {
    const next = new Date(displayedWeekStart);
    next.setDate(next.getDate() + delta * 7);
    setDisplayedWeekStart(next);
  }

  const label = isCurrentWeek ? "Current week" : weekRangeLabel(mondayStr);

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
        <span className="min-w-[160px] text-center text-sm font-semibold">
          {label}
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

      {/* Week box */}
      <HabitDayBox
        label=""
        isCompleted={isCompleted}
        isToday={isCurrentWeek}
        isFuture={isFuture}
        size="lg"
        onClick={() => !isFuture && onToggleDay(mondayStr)}
      />

      {/* Range label */}
      <span className="text-xs text-text-muted">
        {weekRangeLabel(mondayStr)}
      </span>
    </div>
  );
}
