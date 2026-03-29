"use client";

import { useState, useEffect } from "react";
import type { ReadingTarget } from "@/lib/targets";

type TargetFormData = Omit<ReadingTarget, "id" | "user_id" | "created_at">;

const WEEKDAYS = [
  { value: 2, label: "Mon" },
  { value: 3, label: "Tue" },
  { value: 4, label: "Wed" },
  { value: 5, label: "Thu" },
  { value: 6, label: "Fri" },
  { value: 7, label: "Sat" },
  { value: 1, label: "Sun" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type StartPreset = "today" | "week" | "month" | "year" | "custom";
type EndPreset = "week" | "month" | "year" | "custom";
type AnchorDayPreset = "start" | "end" | "custom";

function startOfWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday-based
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(): Date {
  return new Date(new Date().getFullYear(), 0, 1);
}

function endOfWeek(): Date {
  const d = startOfWeek();
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function endOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function endOfYear(): Date {
  return new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
}

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysInMonth(month: number): number {
  // month is 1-based
  return new Date(new Date().getFullYear(), month, 0).getDate();
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function TargetFormModal({
  existing,
  onSave,
  onCancel,
}: {
  existing: ReadingTarget | null;
  onSave: (data: TargetFormData, id?: string) => void;
  onCancel: () => void;
}) {
  const isEdit = !!existing;

  // Form state
  const [kind, setKind] = useState<"deadline" | "rolling">(
    existing?.kind ?? "deadline"
  );
  const [unit, setUnit] = useState<"books" | "pages">(
    existing?.unit ?? "books"
  );
  const [goal, setGoal] = useState(existing?.goal ?? 5);

  // Start date
  const [startPreset, setStartPreset] = useState<StartPreset>(
    existing ? "custom" : "today"
  );
  const [startCustomDate, setStartCustomDate] = useState(
    existing
      ? toDateInputValue(new Date(existing.started_at))
      : toDateInputValue(new Date())
  );

  // End date (deadline only)
  const [endPreset, setEndPreset] = useState<EndPreset>(
    existing?.deadline_at ? "custom" : "month"
  );
  const [endCustomDate, setEndCustomDate] = useState(
    existing?.deadline_at
      ? toDateInputValue(new Date(existing.deadline_at))
      : toDateInputValue(endOfMonth())
  );

  // Cadence (rolling only)
  const [cadenceValue, setCadenceValue] = useState(
    existing?.cadence_value ?? 1
  );
  const [cadenceUnit, setCadenceUnit] = useState(
    existing?.cadence_unit ?? "month"
  );

  // Anchors
  const [anchorWeekday, setAnchorWeekday] = useState(
    existing?.anchor_weekday ?? 2
  ); // Monday
  const [anchorDayPreset, setAnchorDayPreset] = useState<AnchorDayPreset>(
    existing?.anchor_day
      ? existing.anchor_day === 1
        ? "start"
        : existing.anchor_day >= 28
          ? "end"
          : "custom"
      : "start"
  );
  const [anchorCustomDay, setAnchorCustomDay] = useState(
    existing?.anchor_day ?? 1
  );
  const [anchorMonth, setAnchorMonth] = useState(
    existing?.anchor_month ?? 1
  );

  // Toggles
  const [isFeatured, setIsFeatured] = useState(
    existing?.is_home_featured ?? false
  );
  const [isPrivate, setIsPrivate] = useState(existing?.is_private ?? false);

  // Compute actual start date from preset
  const computedStartDate = (() => {
    switch (startPreset) {
      case "today":
        return toDateInputValue(new Date());
      case "week":
        return toDateInputValue(startOfWeek());
      case "month":
        return toDateInputValue(startOfMonth());
      case "year":
        return toDateInputValue(startOfYear());
      case "custom":
        return startCustomDate;
    }
  })();

  // Compute actual end date from preset
  const computedEndDate = (() => {
    switch (endPreset) {
      case "week":
        return toDateInputValue(endOfWeek());
      case "month":
        return toDateInputValue(endOfMonth());
      case "year":
        return toDateInputValue(endOfYear());
      case "custom":
        return endCustomDate;
    }
  })();

  // Update custom date fields when presets change
  useEffect(() => {
    if (startPreset !== "custom") {
      setStartCustomDate(computedStartDate);
    }
  }, [startPreset, computedStartDate]);

  useEffect(() => {
    if (endPreset !== "custom") {
      setEndCustomDate(computedEndDate);
    }
  }, [endPreset, computedEndDate]);

  // Compute anchor day
  const computedAnchorDay = (() => {
    if (kind !== "rolling") return null;
    if (cadenceUnit !== "month" && cadenceUnit !== "year") return null;
    switch (anchorDayPreset) {
      case "start":
        return 1;
      case "end":
        return cadenceUnit === "year" ? daysInMonth(anchorMonth) : 31;
      case "custom":
        return anchorCustomDay;
    }
  })();

  function handleSave() {
    const data: TargetFormData = {
      kind,
      unit,
      goal,
      started_at: new Date(computedStartDate).toISOString(),
      deadline_at:
        kind === "deadline"
          ? new Date(computedEndDate + "T23:59:59").toISOString()
          : null,
      cadence_unit: kind === "rolling" ? cadenceUnit : null,
      cadence_value: cadenceValue,
      anchor_weekday:
        kind === "rolling" && cadenceUnit === "week" ? anchorWeekday : null,
      anchor_day: computedAnchorDay,
      anchor_month:
        kind === "rolling" && cadenceUnit === "year" ? anchorMonth : null,
      is_home_featured: isFeatured,
      is_private: isPrivate,
    };
    onSave(data, existing?.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[10vh]">
      <div
        className="relative w-full max-w-lg rounded-(--radius-card) bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEdit ? "Edit target" : "New target"}
          </h2>
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-full p-1.5 text-text-muted transition-colors hover:bg-bg-light"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="space-y-5">
          {/* Type */}
          <FieldGroup label="Type">
            <div className="grid grid-cols-2 gap-2">
              <PillButton
                active={kind === "deadline"}
                onClick={() => setKind("deadline")}
              >
                Deadline
              </PillButton>
              <PillButton
                active={kind === "rolling"}
                onClick={() => setKind("rolling")}
              >
                Rolling
              </PillButton>
            </div>
          </FieldGroup>

          {/* Unit */}
          <FieldGroup label="What to track">
            <div className="grid grid-cols-2 gap-2">
              <PillButton
                active={unit === "books"}
                onClick={() => setUnit("books")}
              >
                Books
              </PillButton>
              <PillButton
                active={unit === "pages"}
                onClick={() => setUnit("pages")}
              >
                Pages
              </PillButton>
            </div>
          </FieldGroup>

          {/* Goal */}
          <FieldGroup label="Goal">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setGoal(Math.max(1, goal - 1))}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border text-lg font-bold transition-colors hover:bg-bg-light"
              >
                &minus;
              </button>
              <input
                type="number"
                min={1}
                value={goal}
                onChange={(e) =>
                  setGoal(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-20 rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-3 py-2 text-center font-serif text-lg font-bold outline-none focus:border-accent"
              />
              <button
                onClick={() => setGoal(goal + 1)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border text-lg font-bold transition-colors hover:bg-bg-light"
              >
                +
              </button>
              <span className="text-sm text-text-muted">{unit}</span>
            </div>
          </FieldGroup>

          {/* Start date */}
          <FieldGroup label="Start date">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {(
                [
                  ["today", "Today"],
                  ["week", "This week"],
                  ["month", "This month"],
                  ["year", "This year"],
                  ["custom", "Custom"],
                ] as [StartPreset, string][]
              ).map(([value, label]) => (
                <PillButton
                  key={value}
                  active={startPreset === value}
                  onClick={() => setStartPreset(value)}
                  small
                >
                  {label}
                </PillButton>
              ))}
            </div>
            {startPreset === "custom" && (
              <input
                type="date"
                value={startCustomDate}
                onChange={(e) => setStartCustomDate(e.target.value)}
                className="w-full cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-2.5 font-serif outline-none focus:border-accent"
              />
            )}
          </FieldGroup>

          {/* End date (deadline) */}
          {kind === "deadline" && (
            <FieldGroup label="End date">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {(
                  [
                    ["week", "This week"],
                    ["month", "This month"],
                    ["year", "This year"],
                    ["custom", "Custom"],
                  ] as [EndPreset, string][]
                ).map(([value, label]) => (
                  <PillButton
                    key={value}
                    active={endPreset === value}
                    onClick={() => setEndPreset(value)}
                    small
                  >
                    {label}
                  </PillButton>
                ))}
              </div>
              {endPreset === "custom" && (
                <input
                  type="date"
                  value={endCustomDate}
                  onChange={(e) => setEndCustomDate(e.target.value)}
                  className="w-full cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-2.5 font-serif outline-none focus:border-accent"
                />
              )}
            </FieldGroup>
          )}

          {/* Cadence (rolling) */}
          {kind === "rolling" && (
            <FieldGroup label="Repeat every">
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  value={cadenceValue}
                  onChange={(e) =>
                    setCadenceValue(
                      Math.max(1, parseInt(e.target.value) || 1)
                    )
                  }
                  className="w-16 rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-3 py-2.5 text-center font-serif outline-none focus:border-accent"
                />
                <select
                  value={cadenceUnit}
                  onChange={(e) => setCadenceUnit(e.target.value)}
                  className="cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-2.5 font-serif outline-none focus:border-accent"
                >
                  <option value="day">
                    {cadenceValue === 1 ? "Day" : "Days"}
                  </option>
                  <option value="week">
                    {cadenceValue === 1 ? "Week" : "Weeks"}
                  </option>
                  <option value="month">
                    {cadenceValue === 1 ? "Month" : "Months"}
                  </option>
                  <option value="year">
                    {cadenceValue === 1 ? "Year" : "Years"}
                  </option>
                </select>
              </div>
            </FieldGroup>
          )}

          {/* Anchor: weekly */}
          {kind === "rolling" && cadenceUnit === "week" && (
            <FieldGroup label="Resets on">
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((wd) => (
                  <PillButton
                    key={wd.value}
                    active={anchorWeekday === wd.value}
                    onClick={() => setAnchorWeekday(wd.value)}
                    small
                  >
                    {wd.label}
                  </PillButton>
                ))}
              </div>
            </FieldGroup>
          )}

          {/* Anchor: monthly */}
          {kind === "rolling" && cadenceUnit === "month" && (
            <FieldGroup label="Resets on">
              <div className="mb-2 flex flex-wrap gap-1.5">
                <PillButton
                  active={anchorDayPreset === "start"}
                  onClick={() => setAnchorDayPreset("start")}
                  small
                >
                  1st
                </PillButton>
                <PillButton
                  active={anchorDayPreset === "end"}
                  onClick={() => setAnchorDayPreset("end")}
                  small
                >
                  Last day
                </PillButton>
                <PillButton
                  active={anchorDayPreset === "custom"}
                  onClick={() => setAnchorDayPreset("custom")}
                  small
                >
                  Custom
                </PillButton>
              </div>
              {anchorDayPreset === "custom" && (
                <div>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={anchorCustomDay}
                    onChange={(e) =>
                      setAnchorCustomDay(
                        Math.min(31, Math.max(1, parseInt(e.target.value) || 1))
                      )
                    }
                    className="w-20 rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-3 py-2.5 text-center font-serif outline-none focus:border-accent"
                  />
                  <span className="ml-2 text-sm text-text-muted">
                    {ordinalSuffix(anchorCustomDay)} of each month
                  </span>
                </div>
              )}
            </FieldGroup>
          )}

          {/* Anchor: yearly */}
          {kind === "rolling" && cadenceUnit === "year" && (
            <FieldGroup label="Resets on">
              <div className="flex items-center gap-3">
                <select
                  value={anchorMonth}
                  onChange={(e) =>
                    setAnchorMonth(parseInt(e.target.value))
                  }
                  className="cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-4 py-2.5 font-serif outline-none focus:border-accent"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={daysInMonth(anchorMonth)}
                  value={Math.min(anchorCustomDay, daysInMonth(anchorMonth))}
                  onChange={(e) =>
                    setAnchorCustomDay(
                      Math.min(
                        daysInMonth(anchorMonth),
                        Math.max(1, parseInt(e.target.value) || 1)
                      )
                    )
                  }
                  className="w-20 rounded-(--radius-input) border-[1.5px] border-border bg-bg-light px-3 py-2.5 text-center font-serif outline-none focus:border-accent"
                />
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {ordinalSuffix(
                  Math.min(anchorCustomDay, daysInMonth(anchorMonth))
                )}{" "}
                of {MONTHS[anchorMonth - 1]}
              </p>
            </FieldGroup>
          )}

          {/* Toggles */}
          <div className="flex items-center gap-6">
            <ToggleField
              label="Featured"
              checked={isFeatured}
              onChange={setIsFeatured}
            />
            <ToggleField
              label="Private"
              checked={isPrivate}
              onChange={setIsPrivate}
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            className="w-full cursor-pointer rounded-(--radius-input) bg-accent px-6 py-3 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88"
          >
            {isEdit ? "Save changes" : "Create target"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
  small,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-full text-center font-semibold transition-colors ${
        small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
      } ${
        active
          ? "bg-accent text-white"
          : "bg-bg-medium text-text-muted hover:bg-accent/10"
      }`}
    >
      {children}
    </button>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
      <span className="font-medium text-text-primary">{label}</span>
    </label>
  );
}
