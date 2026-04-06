"use client";

import {
  type Habit,
  type HabitStreakData,
  periodLabel,
} from "@/lib/habits";
import { HabitDayView } from "./habit-day-view";
import { HabitWeekView } from "./habit-week-view";
import { HabitMonthView } from "./habit-month-view";
import { WeeklyHabitWeekView } from "./weekly-habit-week-view";
import { WeeklyHabitMonthView } from "./weekly-habit-month-view";

interface HabitCardProps {
  habit: Habit;
  streak: HabitStreakData | null;
  completedDates: Set<string>;
  onToggleDay: (dateStr: string) => void;
  onEdit: () => void;
}

export function HabitCard({
  habit,
  streak,
  completedDates,
  onToggleDay,
  onEdit,
}: HabitCardProps) {
  const cadenceLabel = habit.cadence === "daily" ? "Daily" : "Weekly";

  return (
    <div className="rounded-(--radius-card) bg-bg-medium p-5">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-lg font-bold leading-tight">
            {habit.name}
          </h3>
          <p className="mt-0.5 text-sm text-text-muted">{cadenceLabel}</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex-shrink-0 cursor-pointer p-1 text-text-muted transition-colors hover:text-text-primary"
          title="Edit habit"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        </button>
      </div>

      {/* Grid view */}
      <div className="mb-3">
        {habit.cadence === "daily" && habit.display_cadence === "day" && (
          <HabitDayView
            completedDates={completedDates}
            onToggleDay={onToggleDay}
          />
        )}
        {habit.cadence === "daily" && habit.display_cadence === "week" && (
          <HabitWeekView
            completedDates={completedDates}
            onToggleDay={onToggleDay}
          />
        )}
        {habit.cadence === "daily" && habit.display_cadence === "month" && (
          <HabitMonthView
            completedDates={completedDates}
            onToggleDay={onToggleDay}
          />
        )}
        {habit.cadence === "weekly" && habit.display_cadence === "week" && (
          <WeeklyHabitWeekView
            completedDates={completedDates}
            onToggleDay={onToggleDay}
          />
        )}
        {habit.cadence === "weekly" && habit.display_cadence === "month" && (
          <WeeklyHabitMonthView
            completedDates={completedDates}
            onToggleDay={onToggleDay}
          />
        )}
      </div>

      {/* Streaks */}
      {streak && (
        <div className="flex items-center gap-4 border-t border-border-subtle pt-3 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-base">🔥</span>
            <span className="font-semibold">
              {streak.current_streak}{" "}
              {periodLabel(habit.cadence, streak.current_streak)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-text-muted">
            <span className="text-base">🏆</span>
            <span>
              {streak.longest_streak} best
            </span>
          </div>
          {habit.streak_mode === "grace" && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
              Grace
            </span>
          )}
        </div>
      )}
    </div>
  );
}
