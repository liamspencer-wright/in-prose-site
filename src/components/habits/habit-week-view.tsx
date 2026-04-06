"use client";

import { HabitDayBox } from "./habit-day-box";
import {
  formatDateStr,
  shortDayLabel,
  isFutureDate,
  isToday as isTodayFn,
} from "@/lib/habits";

interface HabitWeekViewProps {
  completedDates: Set<string>;
  onToggleDay: (dateStr: string) => void;
}

export function HabitWeekView({
  completedDates,
  onToggleDay,
}: HabitWeekViewProps) {
  // Build 7-day window ending today
  const today = new Date();
  const days: string[] = [];
  for (let i = -6; i <= 0; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(formatDateStr(d));
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Day labels */}
      <div className="flex gap-1.5">
        {days.map((dateStr) => (
          <div
            key={`label-${dateStr}`}
            className="flex flex-1 items-center justify-center text-[10px] text-text-subtle"
          >
            {shortDayLabel(dateStr)}
          </div>
        ))}
      </div>
      {/* Day boxes */}
      <div className="flex gap-1.5">
        {days.map((dateStr) => (
          <div key={dateStr} className="flex flex-1 justify-center">
            <HabitDayBox
              label=""
              isCompleted={completedDates.has(dateStr)}
              isToday={isTodayFn(dateStr)}
              isFuture={isFutureDate(dateStr)}
              size="md"
              onClick={() => !isFutureDate(dateStr) && onToggleDay(dateStr)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
