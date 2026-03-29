"use client";

import { useState, useEffect } from "react";
import type { ReadingTarget } from "@/lib/targets";
import { addCalendarPeriod } from "@/lib/targets";

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
type EndPreset = "week" | "month" | "year" | "in1week" | "in1month" | "custom";
type AnchorDayPreset = "start" | "end" | "custom";

function startOfWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
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

function inOneWeek(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 59, 999);
  return d;
}

function inOneMonth(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setHours(23, 59, 59, 999);
  return d;
}

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysInMonth(month: number): number {
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

  const [unit, setUnit] = useState<"books" | "pages">(
    existing?.unit ?? "books"
  );
  const [goal, setGoal] = useState(existing?.goal ?? 1);

  // Start date
  const [startPreset, setStartPreset] = useState<StartPreset>(
    existing ? "custom" : "today"
  );
  const [startCustomDate, setStartCustomDate] = useState(
    existing
      ? toDateInputValue(new Date(existing.started_at))
      : toDateInputValue(new Date())
  );

  // Repeating toggle
  const [isRepeating, setIsRepeating] = useState(
    existing ? existing.kind === "rolling" : false
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
  );
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

  const kind = isRepeating ? "rolling" : "deadline";

  // Compute dates
  const computedStartDate = (() => {
    switch (startPreset) {
      case "today": return toDateInputValue(new Date());
      case "week": return toDateInputValue(startOfWeek());
      case "month": return toDateInputValue(startOfMonth());
      case "year": return toDateInputValue(startOfYear());
      case "custom": return startCustomDate;
    }
  })();

  const computedEndDate = (() => {
    switch (endPreset) {
      case "week": return toDateInputValue(endOfWeek());
      case "month": return toDateInputValue(endOfMonth());
      case "year": return toDateInputValue(endOfYear());
      case "in1week": return toDateInputValue(inOneWeek());
      case "in1month": return toDateInputValue(inOneMonth());
      case "custom": return endCustomDate;
    }
  })();

  useEffect(() => {
    if (startPreset !== "custom") setStartCustomDate(computedStartDate);
  }, [startPreset, computedStartDate]);

  useEffect(() => {
    if (endPreset !== "custom") setEndCustomDate(computedEndDate);
  }, [endPreset, computedEndDate]);

  const computedAnchorDay = (() => {
    if (!isRepeating) return null;
    if (cadenceUnit !== "month" && cadenceUnit !== "year") return null;
    switch (anchorDayPreset) {
      case "start": return 1;
      case "end": return cadenceUnit === "year" ? daysInMonth(anchorMonth) : 31;
      case "custom": return anchorCustomDay;
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
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-bg-light"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mx-auto w-full max-w-lg px-5 pt-6 pb-12">
        {/* Title */}
        <h1 className="mb-6 font-serif text-2xl font-bold">
          {isEdit ? "Edit target" : "Set a target"}
        </h1>

        <div className="space-y-4">
          {/* Goal section */}
          <FormCard title="Goal">
            {/* Unit selector - large cards */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <UnitCard
                active={unit === "books"}
                onClick={() => setUnit("books")}
                label="Books"
                icon={
                  <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current">
                    <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z" />
                  </svg>
                }
              />
              <UnitCard
                active={unit === "pages"}
                onClick={() => setUnit("pages")}
                label="Pages"
                icon={
                  <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zM13 9V3.5L18.5 9H13z" />
                  </svg>
                }
              />
            </div>

            {/* Goal stepper - full width */}
            <div className="flex items-center overflow-hidden rounded-(--radius-input) border-[1.5px] border-border bg-white">
              <button
                onClick={() => setGoal(Math.max(1, goal - 1))}
                className="flex h-12 w-16 cursor-pointer items-center justify-center text-xl font-bold text-accent transition-colors hover:bg-bg-light"
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
                className="h-12 flex-1 bg-transparent text-center font-serif text-2xl font-bold outline-none"
              />
              <button
                onClick={() => setGoal(goal + 1)}
                className="flex h-12 w-16 cursor-pointer items-center justify-center text-xl font-bold text-accent transition-colors hover:bg-bg-light"
              >
                +
              </button>
            </div>
          </FormCard>

          {/* Starting section */}
          <FormCard title="Starting">
            <div className="mb-2 flex flex-wrap gap-2">
              {(
                [
                  ["today", "Today"],
                  ["week", "Start of week"],
                  ["month", "Start of month"],
                  ["year", "Start of year"],
                  ["custom", "Custom"],
                ] as [StartPreset, string][]
              ).map(([value, label]) => (
                <PresetPill
                  key={value}
                  active={startPreset === value}
                  onClick={() => setStartPreset(value)}
                >
                  {label}
                </PresetPill>
              ))}
            </div>
            {startPreset === "custom" && (
              <input
                type="date"
                value={startCustomDate}
                onChange={(e) => setStartCustomDate(e.target.value)}
                className="mt-2 w-full cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-white px-4 py-2.5 font-serif outline-none focus:border-accent"
              />
            )}
            <p className="mt-2 text-sm text-text-muted">
              Starting {formatDateLabel(new Date(computedStartDate))}
            </p>
          </FormCard>

          {/* Repeating toggle */}
          <FormCard>
            <div className="flex items-center justify-between">
              <span className="font-serif text-base font-medium">
                Make this a repeating goal?
              </span>
              <ToggleSwitch
                checked={isRepeating}
                onChange={setIsRepeating}
              />
            </div>
          </FormCard>

          {/* Ending section (deadline only) */}
          {!isRepeating && (
            <FormCard title="Ending">
              <div className="mb-2 flex flex-wrap gap-2">
                {(
                  [
                    ["week", "This week"],
                    ["month", "This month"],
                    ["year", "This year"],
                    ["in1week", "In 1 week"],
                    ["in1month", "In 1 month"],
                    ["custom", "Custom"],
                  ] as [EndPreset, string][]
                ).map(([value, label]) => (
                  <PresetPill
                    key={value}
                    active={endPreset === value}
                    onClick={() => setEndPreset(value)}
                  >
                    {label}
                  </PresetPill>
                ))}
              </div>
              {endPreset === "custom" && (
                <input
                  type="date"
                  value={endCustomDate}
                  onChange={(e) => setEndCustomDate(e.target.value)}
                  className="mt-2 w-full cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-white px-4 py-2.5 font-serif outline-none focus:border-accent"
                />
              )}
              <p className="mt-2 text-sm text-text-muted">
                Ending {formatDateLabel(new Date(computedEndDate))}
              </p>
            </FormCard>
          )}

          {/* Cadence (rolling only) */}
          {isRepeating && (
            <FormCard title="Repeat every">
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
                  className="w-16 rounded-(--radius-input) border-[1.5px] border-border bg-white px-3 py-2.5 text-center font-serif outline-none focus:border-accent"
                />
                <select
                  value={cadenceUnit}
                  onChange={(e) => setCadenceUnit(e.target.value)}
                  className="cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-white px-4 py-2.5 font-serif outline-none focus:border-accent"
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
            </FormCard>
          )}

          {/* Anchor: weekly */}
          {isRepeating && cadenceUnit === "week" && (
            <FormCard title="Resets on">
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((wd) => (
                  <PresetPill
                    key={wd.value}
                    active={anchorWeekday === wd.value}
                    onClick={() => setAnchorWeekday(wd.value)}
                  >
                    {wd.label}
                  </PresetPill>
                ))}
              </div>
            </FormCard>
          )}

          {/* Anchor: monthly */}
          {isRepeating && cadenceUnit === "month" && (
            <FormCard title="Resets on">
              <div className="mb-2 flex flex-wrap gap-2">
                <PresetPill
                  active={anchorDayPreset === "start"}
                  onClick={() => setAnchorDayPreset("start")}
                >
                  1st
                </PresetPill>
                <PresetPill
                  active={anchorDayPreset === "end"}
                  onClick={() => setAnchorDayPreset("end")}
                >
                  Last day
                </PresetPill>
                <PresetPill
                  active={anchorDayPreset === "custom"}
                  onClick={() => setAnchorDayPreset("custom")}
                >
                  Custom
                </PresetPill>
              </div>
              {anchorDayPreset === "custom" && (
                <div className="mt-2">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={anchorCustomDay}
                    onChange={(e) =>
                      setAnchorCustomDay(
                        Math.min(
                          31,
                          Math.max(1, parseInt(e.target.value) || 1)
                        )
                      )
                    }
                    className="w-20 rounded-(--radius-input) border-[1.5px] border-border bg-white px-3 py-2.5 text-center font-serif outline-none focus:border-accent"
                  />
                  <span className="ml-2 text-sm text-text-muted">
                    {ordinalSuffix(anchorCustomDay)} of each month
                  </span>
                </div>
              )}
            </FormCard>
          )}

          {/* Anchor: yearly */}
          {isRepeating && cadenceUnit === "year" && (
            <FormCard title="Resets on">
              <div className="flex items-center gap-3">
                <select
                  value={anchorMonth}
                  onChange={(e) =>
                    setAnchorMonth(parseInt(e.target.value))
                  }
                  className="cursor-pointer rounded-(--radius-input) border-[1.5px] border-border bg-white px-4 py-2.5 font-serif outline-none focus:border-accent"
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
                  className="w-20 rounded-(--radius-input) border-[1.5px] border-border bg-white px-3 py-2.5 text-center font-serif outline-none focus:border-accent"
                />
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {ordinalSuffix(
                  Math.min(anchorCustomDay, daysInMonth(anchorMonth))
                )}{" "}
                of {MONTHS[anchorMonth - 1]}
              </p>
            </FormCard>
          )}

          {/* Home screen */}
          <FormCard title="Home screen">
            <div className="flex items-center justify-between">
              <span className="font-serif text-base">Show on home screen</span>
              <ToggleSwitch
                checked={isFeatured}
                onChange={setIsFeatured}
              />
            </div>
          </FormCard>

          {/* Visibility */}
          <FormCard title="Visibility">
            <div className="flex items-center justify-between">
              <span className="font-serif text-base">Private target</span>
              <ToggleSwitch
                checked={isPrivate}
                onChange={setIsPrivate}
              />
            </div>
            <p className="mt-1 text-sm text-text-muted">
              {isPrivate
                ? "Only you can see this target."
                : "This target is visible to friends."}
            </p>
          </FormCard>

          {/* Action buttons */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              className="w-full cursor-pointer rounded-(--radius-card) bg-accent py-4 font-serif text-lg font-bold text-white transition-opacity hover:opacity-88"
            >
              {isEdit ? "Save changes" : "Set target"}
            </button>
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

function UnitCard({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-(--radius-input) border-2 py-5 transition-colors ${
        active
          ? "border-accent bg-accent text-white"
          : "border-accent/30 bg-white text-accent"
      }`}
    >
      {icon}
      <span className="font-serif text-sm font-bold">{label}</span>
    </button>
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
