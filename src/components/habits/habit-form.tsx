"use client";

import { useState } from "react";
import type { Habit, Cadence, DisplayCadence, StreakMode } from "@/lib/habits";

interface HabitFormModalProps {
  existing: Habit | null;
  activeCount: number;
  onSave: (
    data: {
      name: string;
      habit_type: string;
      cadence: Cadence;
      display_cadence: DisplayCadence;
      streak_mode: StreakMode;
      start_date: string;
      end_date: string | null;
      reminder_enabled: boolean;
      reminder_time: string | null;
      show_on_homepage: boolean;
      is_home_featured: boolean;
      sort_order: number;
      is_active: boolean;
    },
    id?: string
  ) => void;
  onArchive?: (id: string) => void;
  onCancel: () => void;
}

const DISPLAY_CADENCE_OPTIONS: Record<
  Cadence,
  { value: DisplayCadence; label: string; hint: string }[]
> = {
  daily: [
    { value: "day", label: "Day", hint: "Shows today's tick box." },
    { value: "week", label: "Week", hint: "Shows a row of 7 day boxes for the week." },
    { value: "month", label: "Month", hint: "Shows a calendar grid for the month." },
  ],
  weekly: [
    { value: "week", label: "Week", hint: "Shows a single tick box for the current week." },
    { value: "month", label: "Month", hint: "Shows a tick box for each week of the month." },
  ],
};

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function HabitFormModal({
  existing,
  activeCount,
  onSave,
  onArchive,
  onCancel,
}: HabitFormModalProps) {
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name ?? "");
  const [cadence, setCadence] = useState<Cadence>(existing?.cadence ?? "daily");
  const [displayCadence, setDisplayCadence] = useState<DisplayCadence>(
    existing?.display_cadence ?? "week"
  );
  const [streakMode, setStreakMode] = useState<StreakMode>(
    existing?.streak_mode ?? "strict"
  );
  const [startDate, setStartDate] = useState(
    existing?.start_date ?? toDateInputValue(new Date())
  );
  const [hasEndDate, setHasEndDate] = useState(!!existing?.end_date);
  const [endDate, setEndDate] = useState(
    existing?.end_date ?? toDateInputValue(new Date())
  );
  const [showOnHomepage, setShowOnHomepage] = useState(
    existing?.show_on_homepage ?? false
  );

  const [confirmArchive, setConfirmArchive] = useState(false);

  // Validate display cadence when cadence changes
  const validOptions = DISPLAY_CADENCE_OPTIONS[cadence];
  const isDisplayCadenceValid = validOptions.some(
    (o) => o.value === displayCadence
  );
  const effectiveDisplayCadence = isDisplayCadenceValid
    ? displayCadence
    : validOptions[0].value;

  function handleCadenceChange(c: Cadence) {
    setCadence(c);
    // Reset display cadence if current isn't valid for new cadence
    const opts = DISPLAY_CADENCE_OPTIONS[c];
    if (!opts.some((o) => o.value === displayCadence)) {
      setDisplayCadence(opts[0].value);
    }
  }

  const atLimit = !isEdit && activeCount >= 5;
  const canSave = name.trim().length > 0 && !atLimit;

  const streakPeriod = cadence === "daily" ? "day" : "week";
  const streakHints: Record<StreakMode, string> = {
    strict: `Miss one ${streakPeriod} and the streak resets.`,
    grace: `One missed ${streakPeriod} is forgiven — two in a row resets the streak.`,
  };

  const selectedDisplayHint = validOptions.find(
    (o) => o.value === effectiveDisplayCadence
  )?.hint;

  function handleSave() {
    onSave(
      {
        name: name.trim(),
        habit_type: "custom",
        cadence,
        display_cadence: effectiveDisplayCadence,
        streak_mode: streakMode,
        start_date: startDate,
        end_date: hasEndDate ? endDate : null,
        reminder_enabled: false,
        reminder_time: null,
        show_on_homepage: showOnHomepage,
        is_home_featured: existing?.is_home_featured ?? false,
        sort_order: existing?.sort_order ?? 0,
        is_active: true,
      },
      existing?.id
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-bg-light"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mx-auto w-full max-w-lg px-5 pt-6 pb-12">
        <h1 className="mb-6 font-serif text-2xl font-bold">
          {isEdit ? "Edit habit" : "Create habit"}
        </h1>

        {atLimit && (
          <div className="mb-4 rounded-(--radius-input) bg-error/10 px-4 py-3 text-sm text-error">
            You already have 5 active habits. Archive one to create a new one.
          </div>
        )}

        <div className="space-y-4">
          {/* Name */}
          <FormCard title="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Read before bed"
              className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-white px-4 py-2.5 font-serif outline-none focus:border-accent"
            />
          </FormCard>

          {/* Cadence */}
          <FormCard title="Cadence">
            <div className="flex gap-2">
              {(["daily", "weekly"] as Cadence[]).map((c) => (
                <PresetPill
                  key={c}
                  active={cadence === c}
                  onClick={() => handleCadenceChange(c)}
                >
                  {c === "daily" ? "Daily" : "Weekly"}
                </PresetPill>
              ))}
            </div>
          </FormCard>

          {/* Display cadence */}
          <FormCard title="Display as">
            <div className="flex gap-2">
              {validOptions.map((opt) => (
                <PresetPill
                  key={opt.value}
                  active={effectiveDisplayCadence === opt.value}
                  onClick={() => setDisplayCadence(opt.value)}
                >
                  {opt.label}
                </PresetPill>
              ))}
            </div>
            {selectedDisplayHint && (
              <p className="mt-2 text-sm text-text-muted">
                {selectedDisplayHint}
              </p>
            )}
          </FormCard>

          {/* Date range */}
          <FormCard title="Start date">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-white px-4 py-2.5 font-serif outline-none focus:border-accent"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="font-serif text-base">Set end date</span>
              <ToggleSwitch checked={hasEndDate} onChange={setHasEndDate} />
            </div>
            {hasEndDate && (
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2 w-full cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-white px-4 py-2.5 font-serif outline-none focus:border-accent"
              />
            )}
          </FormCard>

          {/* Streak mode */}
          <FormCard title="Streak mode">
            <div className="flex gap-2">
              {(["strict", "grace"] as StreakMode[]).map((m) => (
                <PresetPill
                  key={m}
                  active={streakMode === m}
                  onClick={() => setStreakMode(m)}
                >
                  {m === "strict" ? "Strict" : "Grace"}
                </PresetPill>
              ))}
            </div>
            <p className="mt-2 text-sm text-text-muted">
              {streakHints[streakMode]}
            </p>
          </FormCard>

          {/* Homepage */}
          <FormCard title="Homepage">
            <div className="flex items-center justify-between">
              <span className="font-serif text-base">Show on homepage</span>
              <ToggleSwitch
                checked={showOnHomepage}
                onChange={setShowOnHomepage}
              />
            </div>
          </FormCard>

          {/* Action buttons */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`w-full cursor-pointer rounded-(--radius-card) py-4 font-serif text-lg font-bold text-white transition-opacity ${
                canSave
                  ? "bg-accent hover:opacity-88"
                  : "cursor-not-allowed bg-accent/40"
              }`}
            >
              {isEdit ? "Save" : "Create habit"}
            </button>

            {isEdit && onArchive && (
              <>
                {confirmArchive ? (
                  <div className="mt-3 flex items-center justify-center gap-4">
                    <button
                      onClick={() => onArchive(existing!.id)}
                      className="cursor-pointer font-serif text-sm font-semibold text-error transition-colors hover:underline"
                    >
                      Confirm archive
                    </button>
                    <button
                      onClick={() => setConfirmArchive(false)}
                      className="cursor-pointer font-serif text-sm text-text-muted transition-colors hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmArchive(true)}
                    className="mt-3 w-full cursor-pointer rounded-(--radius-card) border-2 border-error/30 py-3 font-serif text-base font-semibold text-error transition-colors hover:bg-error/5"
                  >
                    Archive habit
                  </button>
                )}
              </>
            )}

            <button
              onClick={onCancel}
              className="mt-3 w-full cursor-pointer py-2 text-center font-serif text-base text-text-muted transition-colors hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Shared sub-components ── */

function FormCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-(--radius-card) bg-bg-medium p-5">
      {title && (
        <h2 className="mb-3 font-serif text-lg font-bold">{title}</h2>
      )}
      {children}
    </div>
  );
}

function PresetPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-(--radius-input) border-2 px-3.5 py-2 text-center font-serif text-sm font-semibold transition-colors ${
        active
          ? "border-accent bg-accent text-white"
          : "border-accent/30 bg-white text-accent"
      }`}
    >
      {children}
    </button>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 cursor-pointer rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : ""
        }`}
      />
    </button>
  );
}
