export type Cadence = "daily" | "weekly";
export type DisplayCadence = "day" | "week" | "month";
export type StreakMode = "strict" | "grace";

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  habit_type: string;
  cadence: Cadence;
  display_cadence: DisplayCadence;
  streak_mode: StreakMode;
  start_date: string; // yyyy-MM-dd
  end_date: string | null;
  reminder_enabled: boolean;
  reminder_time: string | null;
  show_on_homepage: boolean;
  is_home_featured: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  log_date: string; // yyyy-MM-dd
  completed: boolean;
  created_at: string;
}

export interface HabitStreakData {
  habit_id: string;
  current_streak: number;
  longest_streak: number;
  last_21_days: { date: string; completed: boolean }[];
}

// --- Date helpers ---

export function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Get Monday of the week containing `d` */
export function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  const mon = new Date(d);
  mon.setDate(mon.getDate() + diff);
  return mon;
}

/** Short day label: M, T, W, T, F, S, S */
export function shortDayLabel(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
}

/** Day number: 1, 2, ... 31 */
export function dayNum(dateStr: string): string {
  return String(parseDateStr(dateStr).getDate());
}

/** Check if a date string is in the future (after today) */
export function isFutureDate(dateStr: string): boolean {
  const today = formatDateStr(new Date());
  return dateStr > today;
}

/** Check if a date string is today */
export function isToday(dateStr: string): boolean {
  return dateStr === formatDateStr(new Date());
}

/** Format week range: "1 Apr – 7 Apr" */
export function weekRangeLabel(mondayStr: string): string {
  const mon = parseDateStr(mondayStr);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;
  return `${fmt(mon)} – ${fmt(sun)}`;
}

/** Cadence period label for streaks */
export function periodLabel(cadence: Cadence, count: number): string {
  const unit = cadence === "daily" ? "day" : "week";
  return count === 1 ? unit : `${unit}s`;
}
