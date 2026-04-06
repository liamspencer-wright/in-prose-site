"use client";

import { useState } from "react";
import { HabitDayBox } from "./habit-day-box";
import {
  formatDateStr,
  startOfWeek,
  weekRangeLabel,
  isFutureDate,
} from "@/lib/habits";

interface WeeklyHabitMonthViewProps {
  completedDates: Set<string>;
  onToggleDay: (dateStr: string) => void;
}

export function WeeklyHabitMonthView({
  completedDates,
  onToggleDay,
}: WeeklyHabitMonthViewProps) {
  const [displayedMonth, setDisplayedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();

  const monthTitle = displayedMonth.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  // Compute all Monday dates for weeks that overlap this month
  const weeks: string[] = [];
  const seen = new Set<string>();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const monday = startOfWeek(date);
    const mondayStr = formatDateStr(monday);
    if (!seen.has(mondayStr)) {
      seen.add(mondayStr);
      weeks.push(mondayStr);
    }
  }

  const currentWeekMonday = formatDateStr(startOfWeek(new Date()));

  function navigate(delta: number) {
    setDisplayedMonth(new Date(year, month + delta, 1));
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="cursor-pointer p-1 text-text-muted transition-colors hover:text-text-primary"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        <span className="text-sm font-semibold">{monthTitle}</span>
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

      {/* Week rows */}
      <div className="flex flex-col gap-2">
        {weeks.map((mondayStr) => {
          const isCurrentWeek = mondayStr === currentWeekMonday;
          const isFuture = isFutureDate(mondayStr);
          const isCompleted = completedDates.has(mondayStr);

          return (
            <div
              key={mondayStr}
              className="flex items-center gap-3"
            >
              <HabitDayBox
                label=""
                isCompleted={isCompleted}
                isToday={isCurrentWeek}
                isFuture={isFuture}
                size="sm"
                onClick={() => !isFuture && onToggleDay(mondayStr)}
              />
              <span className="text-xs text-text-muted">
                {weekRangeLabel(mondayStr)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
