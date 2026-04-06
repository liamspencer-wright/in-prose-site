"use client";

import { useState } from "react";
import { HabitDayBox } from "./habit-day-box";
import {
  formatDateStr,
  isFutureDate,
  isToday as isTodayFn,
} from "@/lib/habits";

interface HabitMonthViewProps {
  completedDates: Set<string>;
  onToggleDay: (dateStr: string) => void;
}

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function HabitMonthView({
  completedDates,
  onToggleDay,
}: HabitMonthViewProps) {
  const [displayedMonth, setDisplayedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();

  // Month title
  const monthTitle = displayedMonth.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  // Days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Day of week for the 1st (Monday = 0 ... Sunday = 6)
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // shift Sunday from 0 to 6

  // Build grid cells: null for padding, string for dates
  const cells: (string | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatDateStr(new Date(year, month, d));
    cells.push(dateStr);
  }

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

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-semibold text-text-subtle"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((dateStr, i) =>
          dateStr === null ? (
            <div key={`empty-${i}`} />
          ) : (
            <div key={dateStr} className="flex justify-center">
              <HabitDayBox
                label={String(new Date(dateStr + "T00:00:00").getDate())}
                isCompleted={completedDates.has(dateStr)}
                isToday={isTodayFn(dateStr)}
                isFuture={isFutureDate(dateStr)}
                size="sm"
                onClick={() =>
                  !isFutureDate(dateStr) && onToggleDay(dateStr)
                }
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}
