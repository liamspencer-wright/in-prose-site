"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import {
  type Habit,
  type HabitStreakData,
} from "@/lib/habits";
import { HabitCard } from "./habit-card";
import { HabitFormModal } from "./habit-form";

export function HabitsTab() {
  const { user } = useAuth();
  const supabase = createClient();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [streaks, setStreaks] = useState<Record<string, HabitStreakData>>({});
  const [habitLogs, setHabitLogs] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const load = useCallback(async () => {
    if (!user) return;

    // Load active habits
    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const loadedHabits = (habitsData as Habit[]) ?? [];
    setHabits(loadedHabits);

    // Load streaks via RPC
    const { data: streaksData } = await supabase.rpc("get_habit_streaks", {
      p_user_id: user.id,
    });

    const streaksMap: Record<string, HabitStreakData> = {};
    if (streaksData) {
      for (const s of streaksData as HabitStreakData[]) {
        streaksMap[s.habit_id] = s;
      }
    }
    setStreaks(streaksMap);

    // Load logs for each habit
    const logsMap: Record<string, Set<string>> = {};
    for (const habit of loadedHabits) {
      const { data: logsData } = await supabase
        .from("habit_logs")
        .select("log_date")
        .eq("habit_id", habit.id)
        .eq("completed", true);

      const dates = new Set<string>();
      if (logsData) {
        for (const log of logsData) {
          dates.add(log.log_date);
        }
      }
      logsMap[habit.id] = dates;
    }
    setHabitLogs(logsMap);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleDay = useCallback(
    async (habit: Habit, dateStr: string) => {
      if (!user) return;

      const currentLogs = habitLogs[habit.id] ?? new Set();
      const isCompleted = currentLogs.has(dateStr);

      // Optimistic update
      const newLogs = new Set(currentLogs);
      if (isCompleted) {
        newLogs.delete(dateStr);
      } else {
        newLogs.add(dateStr);
      }
      setHabitLogs((prev) => ({ ...prev, [habit.id]: newLogs }));

      try {
        if (isCompleted) {
          await supabase
            .from("habit_logs")
            .delete()
            .eq("habit_id", habit.id)
            .eq("log_date", dateStr);
        } else {
          await supabase.from("habit_logs").upsert(
            {
              habit_id: habit.id,
              user_id: user.id,
              log_date: dateStr,
              completed: true,
            },
            { onConflict: "habit_id,log_date" }
          );
        }

        // Refresh streaks
        const { data: streaksData } = await supabase.rpc(
          "get_habit_streaks",
          { p_user_id: user.id }
        );
        if (streaksData) {
          const streaksMap: Record<string, HabitStreakData> = {};
          for (const s of streaksData as HabitStreakData[]) {
            streaksMap[s.habit_id] = s;
          }
          setStreaks(streaksMap);
        }
      } catch {
        setHabitLogs((prev) => ({ ...prev, [habit.id]: currentLogs }));
      }
    },
    [user, habitLogs, supabase]
  );

  // CRUD handlers
  async function handleSave(
    data: Omit<Habit, "id" | "user_id" | "created_at">,
    id?: string
  ) {
    if (!user) return;

    if (id) {
      await supabase.from("habits").update(data).eq("id", id);
    } else {
      await supabase.from("habits").insert({ ...data, user_id: user.id });
    }

    setShowForm(false);
    setEditingHabit(null);
    await load();
  }

  async function handleArchive(habitId: string) {
    await supabase
      .from("habits")
      .update({ is_active: false })
      .eq("id", habitId);

    setShowForm(false);
    setEditingHabit(null);
    await load();
  }

  function openCreate() {
    setEditingHabit(null);
    setShowForm(true);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-(--radius-card) bg-border"
          />
        ))}
      </div>
    );
  }

  if (habits.length === 0 && !showForm) {
    return (
      <>
        <div className="py-16 text-center">
          <p className="text-lg font-semibold text-text-primary">
            Track your reading habits
          </p>
          <p className="mt-2 text-text-muted">
            Create daily or weekly habits and track your streaks.
          </p>
          <button
            onClick={openCreate}
            className="mt-4 cursor-pointer rounded-(--radius-input) bg-accent px-6 py-2.5 font-serif font-bold text-white transition-opacity hover:opacity-88"
          >
            Create your first habit
          </button>
        </div>

        {showForm && (
          <HabitFormModal
            existing={editingHabit}
            activeCount={habits.length}
            onSave={handleSave}
            onArchive={editingHabit ? handleArchive : undefined}
            onCancel={() => {
              setShowForm(false);
              setEditingHabit(null);
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            streak={streaks[habit.id] ?? null}
            completedDates={habitLogs[habit.id] ?? new Set()}
            onToggleDay={(dateStr) => toggleDay(habit, dateStr)}
            onEdit={() => {
              setEditingHabit(habit);
              setShowForm(true);
            }}
          />
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={openCreate}
        className="fixed right-8 bottom-8 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform hover:scale-105 max-sm:right-5 max-sm:bottom-20"
        title="New habit"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>

      {/* Form modal */}
      {showForm && (
        <HabitFormModal
          existing={editingHabit}
          activeCount={habits.length}
          onSave={handleSave}
          onArchive={editingHabit ? handleArchive : undefined}
          onCancel={() => {
            setShowForm(false);
            setEditingHabit(null);
          }}
        />
      )}
    </>
  );
}
