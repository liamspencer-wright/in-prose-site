// Shared types and computation for reading targets

export type ReadingTarget = {
  id: string;
  user_id: string;
  kind: "deadline" | "rolling";
  unit: "books" | "pages";
  goal: number;
  started_at: string;
  deadline_at: string | null;
  cadence_unit: string | null;
  cadence_value: number;
  anchor_weekday: number | null;
  anchor_day: number | null;
  anchor_month: number | null;
  is_home_featured: boolean;
  is_private: boolean;
  created_at: string;
};

export type FinishedBook = {
  finished_at: string | null;
  pages: number | null;
};

export type TargetStatus = "active" | "completed" | "missed";

export function getTargetStatus(
  target: ReadingTarget,
  progress: number
): TargetStatus {
  if (progress >= target.goal) return "completed";
  if (target.kind === "deadline" && target.deadline_at) {
    if (new Date(target.deadline_at) < new Date()) return "missed";
  }
  return "active";
}

export function getTargetTitle(target: ReadingTarget): string {
  const unitLabel = target.unit === "books" ? "book" : "page";
  const plural = target.goal !== 1 ? "s" : "";

  if (target.kind === "deadline") {
    if (!target.deadline_at) return `${target.goal} ${unitLabel}${plural}`;
    const deadline = new Date(target.deadline_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${target.goal} ${unitLabel}${plural} by ${deadline}`;
  }

  const cu = target.cadence_unit ?? "period";
  if (target.cadence_value === 1) {
    return `${target.goal} ${unitLabel}${plural} per ${cu}`;
  }
  return `${target.goal} ${unitLabel}${plural} every ${target.cadence_value} ${cu}s`;
}

export function getTargetSubtitle(
  target: ReadingTarget,
  progress: number
): string {
  if (progress >= target.goal) return "Goal reached!";

  if (target.kind === "deadline") {
    if (!target.deadline_at) return "";
    const now = new Date();
    const deadline = new Date(target.deadline_at);
    if (deadline < now) return "Deadline passed";
    const days = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return "Due today";
    return `${days} day${days === 1 ? "" : "s"} left`;
  }

  const cu = target.cadence_unit ?? "period";
  if (target.cadence_value === 1) return `This ${cu}`;
  return `Every ${target.cadence_value} ${cu}s`;
}

export function computeProgress(
  target: ReadingTarget,
  finishedBooks: FinishedBook[]
): number {
  const qualifying = finishedBooks.filter((b) => {
    if (!b.finished_at) return false;
    const finishedAt = new Date(b.finished_at);

    if (target.kind === "deadline") {
      if (!target.deadline_at) return false;
      return (
        finishedAt >= new Date(target.started_at) &&
        finishedAt <= new Date(target.deadline_at)
      );
    }

    const windowStart = getRollingWindowStart(target);
    return windowStart ? finishedAt >= windowStart : false;
  });

  if (target.unit === "pages") {
    return qualifying.reduce((sum, b) => sum + (b.pages ?? 0), 0);
  }
  return qualifying.length;
}

export function computeHistory(
  target: ReadingTarget,
  finishedBooks: FinishedBook[]
): { start: Date; end: Date; count: number }[] {
  if (target.kind !== "rolling" || !target.cadence_unit) return [];

  const now = new Date();
  const startedAt = new Date(target.started_at);
  const windows: { start: Date; end: Date }[] = [];

  let windowStart = new Date(startedAt);
  while (windowStart < now) {
    const nextStart = addCalendarPeriod(
      windowStart,
      target.cadence_unit,
      target.cadence_value
    );
    if (nextStart <= now) {
      windows.push({ start: new Date(windowStart), end: nextStart });
    } else {
      windows.push({ start: new Date(windowStart), end: now });
    }
    windowStart = nextStart;
  }

  if (windows.length === 0) {
    windows.push({ start: startedAt, end: now });
  }

  return windows.reverse().map((w) => {
    const qualifying = finishedBooks.filter((b) => {
      if (!b.finished_at) return false;
      const d = new Date(b.finished_at);
      return d >= w.start && d <= w.end;
    });
    const count =
      target.unit === "pages"
        ? qualifying.reduce((sum, b) => sum + (b.pages ?? 0), 0)
        : qualifying.length;
    return { ...w, count };
  });
}

export function getRollingWindowStart(target: ReadingTarget): Date | null {
  if (target.kind !== "rolling" || !target.cadence_unit) return null;

  const now = new Date();
  const value = target.cadence_value;

  switch (target.cadence_unit) {
    case "day": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - value);
      return start;
    }
    case "week": {
      if (target.anchor_weekday) {
        const jsWeekday = target.anchor_weekday - 1;
        const anchor = new Date(now);
        anchor.setHours(0, 0, 0, 0);
        const currentDay = anchor.getDay();
        const diff = currentDay - jsWeekday;
        anchor.setDate(anchor.getDate() - (diff >= 0 ? diff : diff + 7));
        if (anchor > now) {
          anchor.setDate(anchor.getDate() - 7 * value);
        }
        return anchor;
      }
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setDate(start.getDate() - 7 * (value - 1));
      return start;
    }
    case "month": {
      const day = target.anchor_day ?? 1;
      const anchor = new Date(
        now.getFullYear(),
        now.getMonth(),
        day,
        0,
        0,
        0,
        0
      );
      if (anchor > now) {
        anchor.setMonth(anchor.getMonth() - value);
      }
      return anchor;
    }
    case "year": {
      const month = (target.anchor_month ?? 1) - 1;
      const day = target.anchor_day ?? 1;
      const anchor = new Date(
        now.getFullYear(),
        month,
        day,
        0,
        0,
        0,
        0
      );
      if (anchor > now) {
        anchor.setFullYear(anchor.getFullYear() - value);
      }
      return anchor;
    }
    default:
      return null;
  }
}

export function addCalendarPeriod(
  date: Date,
  unit: string,
  value: number
): Date {
  const result = new Date(date);
  switch (unit) {
    case "day":
      result.setDate(result.getDate() + value);
      break;
    case "week":
      result.setDate(result.getDate() + value * 7);
      break;
    case "month":
      result.setMonth(result.getMonth() + value);
      break;
    case "year":
      result.setFullYear(result.getFullYear() + value);
      break;
  }
  return result;
}

export function formatPeriodLabel(
  date: Date,
  cadenceUnit: string | null
): string {
  switch (cadenceUnit) {
    case "day":
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
    case "week":
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
    case "month":
      return date.toLocaleDateString("en-GB", { month: "short" });
    case "year":
      return date.getFullYear().toString();
    default:
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
  }
}

export function segmentStep(goal: number, unit: "books" | "pages"): number {
  if (unit === "books") {
    return goal <= 20 ? 1 : Math.ceil(goal / 20);
  }
  const candidates = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  for (const c of candidates) {
    if (goal / c <= 20) return c;
  }
  return candidates[candidates.length - 1];
}
