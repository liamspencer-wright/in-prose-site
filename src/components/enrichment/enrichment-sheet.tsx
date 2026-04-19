"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getActiveTemplate,
  getResponse,
  upsertResponse,
  type TemplateKey,
} from "@/lib/enrichment/client";
import type {
  AnswersMap,
  CustomAnswersMap,
  SurveyOption,
  SurveyQuestion,
  SurveyTemplate,
} from "@/lib/enrichment/types";

type Props = {
  isbn13: string;
  userId: string;
  templateKey: TemplateKey;
  // Optional pre-seed for answers — used by the post-read flow to pre-fill
  // expected_vibes from the pre-read response, and to inherit custom
  // write-ins onto the actual_vibes card.
  initialAnswers?: AnswersMap;
  initialAnswersCustom?: CustomAnswersMap;
  onClose: () => void;
};

// Normalises an answer value from JSONB — arrays and scalars both arrive.
function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function questionMetadata(q: SurveyQuestion): Record<string, unknown> {
  return (q.metadata ?? {}) as Record<string, unknown>;
}

function optionMetadata(o: SurveyOption): Record<string, unknown> {
  return (o.metadata ?? {}) as Record<string, unknown>;
}

export function EnrichmentSheet({
  isbn13,
  userId,
  templateKey,
  initialAnswers,
  initialAnswersCustom,
  onClose,
}: Props) {
  const [template, setTemplate] = useState<SurveyTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [answersCustom, setAnswersCustom] = useState<CustomAnswersMap>({});
  const [viewedKeys, setViewedKeys] = useState<Set<string>>(new Set());

  // ── Load template + existing response ──
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const t = await getActiveTemplate(templateKey);
        if (!t) {
          if (!cancelled) setError("Survey not available.");
          return;
        }
        const existing = await getResponse(userId, isbn13, t.version_id);

        if (cancelled) return;
        setTemplate(t);

        // Merge order: existing response overrides seeded initial answers;
        // seeded answers fill in the blanks (pre-fill from pre-read).
        const seededAnswers = { ...(initialAnswers ?? {}) };
        const seededCustom = { ...(initialAnswersCustom ?? {}) };
        if (existing) {
          for (const [k, v] of Object.entries(existing.answers ?? {})) {
            seededAnswers[k] = v as AnswersMap[string];
          }
          for (const [k, v] of Object.entries(existing.answers_custom ?? {})) {
            if (isStringArray(v)) seededCustom[k] = v;
          }
        }
        setAnswers(seededAnswers);
        setAnswersCustom(seededCustom);

        if (t.questions.length > 0) {
          setViewedKeys(new Set([t.questions[0].key]));
        }
      } catch {
        if (!cancelled) setError("Couldn't load survey.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isbn13, userId, templateKey]);

  // Escape closes (and saves partial).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, answersCustom, viewedKeys, template]);

  const questions = useMemo(() => template?.questions ?? [], [template]);
  const totalCards = questions.length;
  const currentQuestion = questions[currentIndex] ?? null;
  const isFinalCard = currentIndex >= totalCards - 1;
  const progress =
    totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;

  // ── Persistence ──
  const persist = useCallback(
    async (opts: {
      nextAnswers?: AnswersMap;
      nextCustom?: CustomAnswersMap;
      nextViewed?: Set<string>;
      completed?: boolean;
    }) => {
      if (!template) return;
      const a = opts.nextAnswers ?? answers;
      const c = opts.nextCustom ?? answersCustom;
      const viewed = opts.nextViewed ?? viewedKeys;

      const answered = Array.from(viewed).filter((k) =>
        hasAnswer(k, a, c)
      ).length;
      const skipped = Math.max(0, viewed.size - answered);

      try {
        await upsertResponse({
          userId,
          isbn13,
          templateVersionId: template.version_id,
          answers: a,
          answersCustom: c,
          cardsShown: viewed.size,
          cardsAnswered: answered,
          cardsSkipped: skipped,
          completedAt: opts.completed ? new Date().toISOString() : null,
        });
      } catch {
        // Non-fatal — the user can close and retry later.
      }
    },
    [template, userId, isbn13, answers, answersCustom, viewedKeys]
  );

  // ── Navigation ──
  const markViewed = useCallback(
    (key: string) => {
      setViewedKeys((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        return next;
      });
    },
    [setViewedKeys]
  );

  const advance = useCallback(async () => {
    if (!template) return;
    if (isFinalCard) {
      await persist({ completed: true });
      onClose();
      return;
    }
    const nextIndex = currentIndex + 1;
    const nextKey = questions[nextIndex]?.key;
    const nextViewed = nextKey
      ? new Set(viewedKeys).add(nextKey)
      : viewedKeys;
    setCurrentIndex(nextIndex);
    if (nextKey) markViewed(nextKey);
    await persist({ nextViewed });
  }, [
    template,
    isFinalCard,
    currentIndex,
    questions,
    viewedKeys,
    persist,
    markViewed,
    onClose,
  ]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex]);

  const skipCurrent = useCallback(async () => {
    if (!currentQuestion) return;
    // Clear any partial answer on the current card before advancing.
    const nextAnswers = { ...answers };
    delete nextAnswers[currentQuestion.key];
    const nextCustom = { ...answersCustom };
    delete nextCustom[currentQuestion.key];
    setAnswers(nextAnswers);
    setAnswersCustom(nextCustom);

    if (isFinalCard) {
      await persist({
        nextAnswers,
        nextCustom,
        completed: true,
      });
      onClose();
      return;
    }
    const nextIndex = currentIndex + 1;
    const nextKey = questions[nextIndex]?.key;
    const nextViewed = nextKey
      ? new Set(viewedKeys).add(nextKey)
      : viewedKeys;
    setCurrentIndex(nextIndex);
    if (nextKey) markViewed(nextKey);
    await persist({
      nextAnswers,
      nextCustom,
      nextViewed,
    });
  }, [
    currentQuestion,
    answers,
    answersCustom,
    isFinalCard,
    currentIndex,
    questions,
    viewedKeys,
    persist,
    markViewed,
    onClose,
  ]);

  const skipAll = useCallback(async () => {
    await persist({ completed: false });
    onClose();
  }, [persist, onClose]);

  async function handleClose() {
    await persist({ completed: false });
    onClose();
  }

  // ── Mutation helpers ──
  const setSingle = useCallback(
    (key: string, value: string) => {
      setAnswers((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const toggleMulti = useCallback((key: string, value: string) => {
    setAnswers((prev) => {
      const raw = prev[key];
      const current = Array.isArray(raw) ? [...raw] : [];
      const idx = current.indexOf(value);
      if (idx >= 0) current.splice(idx, 1);
      else current.push(value);
      const next = { ...prev };
      if (current.length === 0) delete next[key];
      else next[key] = current;
      return next;
    });
  }, []);

  const setSlider = useCallback((key: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setCustomTags = useCallback((key: string, tags: string[]) => {
    const trimmed = tags.map((t) => t.trim()).filter((t) => t.length > 0);
    setAnswersCustom((prev) => {
      const next = { ...prev };
      if (trimmed.length === 0) delete next[key];
      else next[key] = trimmed;
      return next;
    });
  }, []);

  // ── Render ──
  if (loading) {
    return (
      <Overlay onClose={handleClose}>
        <p className="py-12 text-center text-text-muted">Loading…</p>
      </Overlay>
    );
  }

  if (error || !template || !currentQuestion) {
    return (
      <Overlay onClose={handleClose}>
        <div className="py-12 text-center">
          <p className="mb-4 text-text-muted">{error ?? "No survey questions."}</p>
          <button
            onClick={handleClose}
            className="cursor-pointer rounded-(--radius-input) bg-accent px-6 py-2.5 text-sm font-semibold text-white"
          >
            Close
          </button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={handleClose}>
      {/* Top bar: progress + skip all */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={handleClose}
          aria-label="Close"
          className="cursor-pointer text-text-muted hover:text-text-primary"
        >
          ✕
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <button
          onClick={skipAll}
          className="cursor-pointer text-sm text-text-muted hover:text-text-primary"
        >
          Skip all
        </button>
      </div>

      <QuestionCard
        question={currentQuestion}
        answers={answers}
        answersCustom={answersCustom}
        setSingle={setSingle}
        toggleMulti={toggleMulti}
        setSlider={setSlider}
        setCustomTags={setCustomTags}
        onAutoAdvance={advance}
      />

      {/* Action row */}
      <div className="mt-6 flex items-center gap-3">
        {currentIndex > 0 && (
          <button
            onClick={goBack}
            className="cursor-pointer rounded-(--radius-input) border border-border px-4 py-3 font-semibold text-text-muted transition-colors hover:bg-bg-medium"
          >
            ← Back
          </button>
        )}
        <button
          onClick={skipCurrent}
          className="cursor-pointer px-4 py-3 font-semibold text-text-muted hover:text-text-primary"
        >
          Skip
        </button>
        <div className="flex-1" />
        <button
          onClick={advance}
          className="cursor-pointer rounded-(--radius-input) bg-accent px-8 py-3 font-serif text-base font-bold text-white transition-opacity hover:opacity-88"
        >
          {isFinalCard ? "Finish" : "Next"}
        </button>
      </div>
    </Overlay>
  );
}

// ── Overlay wrapper ──

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="mx-auto mt-12 w-full max-w-lg rounded-(--radius-card) bg-bg-light p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ── Question card router ──

function QuestionCard({
  question,
  answers,
  answersCustom,
  setSingle,
  toggleMulti,
  setSlider,
  setCustomTags,
  onAutoAdvance,
}: {
  question: SurveyQuestion;
  answers: AnswersMap;
  answersCustom: CustomAnswersMap;
  setSingle: (key: string, value: string) => void;
  toggleMulti: (key: string, value: string) => void;
  setSlider: (key: string, value: number) => void;
  setCustomTags: (key: string, tags: string[]) => void;
  onAutoAdvance: () => void;
}) {
  return (
    <div>
      <h2 className="mb-5 font-serif text-2xl font-bold leading-tight">
        {question.prompt}
      </h2>

      {question.kind === "single_select" && (
        <SingleSelectCard
          question={question}
          value={
            typeof answers[question.key] === "string"
              ? (answers[question.key] as string)
              : null
          }
          customTags={answersCustom[question.key] ?? []}
          onSelect={(v) => {
            setSingle(question.key, v);
            // Auto-advance unless the card has a free-text field waiting for input.
            if (!question.allow_custom) {
              setTimeout(() => onAutoAdvance(), 220);
            }
          }}
          onCustomChange={(tags) => setCustomTags(question.key, tags)}
        />
      )}

      {question.kind === "multi_select" && (
        <MultiSelectCard
          question={question}
          values={
            Array.isArray(answers[question.key])
              ? (answers[question.key] as string[])
              : []
          }
          customTags={answersCustom[question.key] ?? []}
          inheritedCustoms={resolveInheritedCustoms(question, answersCustom)}
          onToggle={(v) => toggleMulti(question.key, v)}
          onCustomChange={(tags) => setCustomTags(question.key, tags)}
        />
      )}

      {question.kind === "slider" && (
        <SliderCard
          question={question}
          value={
            typeof answers[question.key] === "number"
              ? (answers[question.key] as number)
              : null
          }
          onChange={(v) => setSlider(question.key, v)}
        />
      )}
    </div>
  );
}

// ── Pill grid ──

function PillGrid({
  question,
  isSelected,
  onTap,
}: {
  question: SurveyQuestion;
  isSelected: (option: SurveyOption) => boolean;
  onTap: (option: SurveyOption) => void;
}) {
  const meta = questionMetadata(question);
  const columnsRaw = meta["columns"];
  const columns = typeof columnsRaw === "number" ? columnsRaw : 2;

  const regular: SurveyOption[] = [];
  const fullWidth: SurveyOption[] = [];
  for (const o of question.options) {
    const om = optionMetadata(o);
    if (om["full_width"] === true) fullWidth.push(o);
    else regular.push(o);
  }

  const gridCols =
    columns === 1 ? "grid-cols-1" : columns === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <div className="space-y-2.5">
      <div className={`grid gap-2.5 ${gridCols}`}>
        {regular.map((option) => (
          <Pill
            key={option.id}
            label={option.label}
            selected={isSelected(option)}
            onClick={() => onTap(option)}
          />
        ))}
      </div>
      {fullWidth.map((option) => (
        <Pill
          key={option.id}
          label={option.label}
          selected={isSelected(option)}
          onClick={() => onTap(option)}
        />
      ))}
    </div>
  );
}

function Pill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-(--radius-input) border-2 px-4 py-3 text-center text-sm font-semibold transition-colors ${
        selected
          ? "border-accent bg-accent text-white"
          : "border-accent/30 bg-white text-accent hover:bg-accent/10"
      }`}
    >
      {label}
    </button>
  );
}

// ── Single select card ──

function SingleSelectCard({
  question,
  value,
  customTags,
  onSelect,
  onCustomChange,
}: {
  question: SurveyQuestion;
  value: string | null;
  customTags: string[];
  onSelect: (value: string) => void;
  onCustomChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState(customTags[0] ?? "");
  useEffect(() => {
    setDraft(customTags[0] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.key]);

  return (
    <div className="space-y-4">
      <PillGrid
        question={question}
        isSelected={(o) => value === o.value}
        onTap={(o) => onSelect(o.value)}
      />
      {question.allow_custom && (
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-text-muted">
            Something else?
          </label>
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              const t = e.target.value.trim();
              onCustomChange(t.length > 0 ? [t] : []);
            }}
            placeholder="Tell us more…"
            className="w-full rounded-(--radius-input) border-[1.5px] border-border bg-white px-4 py-2.5 font-serif outline-none focus:border-accent"
          />
        </div>
      )}
    </div>
  );
}

// ── Multi select card ──

function MultiSelectCard({
  question,
  values,
  customTags,
  inheritedCustoms,
  onToggle,
  onCustomChange,
}: {
  question: SurveyQuestion;
  values: string[];
  customTags: string[];
  inheritedCustoms: string[];
  onToggle: (value: string) => void;
  onCustomChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  useEffect(() => setDraft(""), [question.key]);

  const inherited = inheritedCustoms;

  function toggleInherited(val: string) {
    const exists = customTags.some(
      (t) => t.toLowerCase() === val.toLowerCase()
    );
    if (exists) {
      onCustomChange(
        customTags.filter((t) => t.toLowerCase() !== val.toLowerCase())
      );
    } else {
      onCustomChange([...customTags, val]);
    }
  }

  function addTag() {
    const t = draft.trim();
    if (!t) return;
    const exists = customTags.some(
      (x) => x.toLowerCase() === t.toLowerCase()
    );
    if (!exists) onCustomChange([...customTags, t]);
    setDraft("");
  }

  function removeTag(tag: string) {
    onCustomChange(customTags.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">Pick as many as you like.</p>
      <PillGrid
        question={question}
        isSelected={(o) => values.includes(o.value)}
        onTap={(o) => onToggle(o.value)}
      />

      {inherited.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-text-muted">
            Also consider
          </p>
          <div className="flex flex-wrap gap-2">
            {inherited.map((v) => {
              const selected = customTags.some(
                (t) => t.toLowerCase() === v.toLowerCase()
              );
              return (
                <button
                  key={v}
                  onClick={() => toggleInherited(v)}
                  className={`cursor-pointer rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    selected
                      ? "border-accent bg-accent text-white"
                      : "border-accent/30 bg-white text-accent"
                  }`}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {question.allow_custom && (
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-text-muted">
            Add your own
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Anything else…"
              className="flex-1 rounded-(--radius-input) border-[1.5px] border-border bg-white px-4 py-2.5 font-serif outline-none focus:border-accent"
            />
            <button
              onClick={addTag}
              disabled={!draft.trim()}
              className="cursor-pointer rounded-(--radius-input) bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-88 disabled:cursor-default disabled:opacity-55"
            >
              Add
            </button>
          </div>
          {customTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {customTags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="cursor-pointer opacity-60 hover:opacity-100"
                    aria-label={`Remove ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Pulls custom write-ins from another question referenced via
// `metadata.inherit_customs_from`. Used to surface expected_vibes customs
// (e.g. "nostalgic") as tappable "Also consider" pills on actual_vibes.
function resolveInheritedCustoms(
  question: SurveyQuestion,
  answersCustom: CustomAnswersMap
): string[] {
  const meta = questionMetadata(question);
  const sourceKey = meta["inherit_customs_from"];
  if (typeof sourceKey !== "string") return [];
  return answersCustom[sourceKey] ?? [];
}

// ── Slider card ──

function SliderCard({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: number | null;
  onChange: (value: number) => void;
}) {
  const meta = questionMetadata(question);
  const min = typeof meta["min"] === "number" ? (meta["min"] as number) : 0;
  const max = typeof meta["max"] === "number" ? (meta["max"] as number) : 10;
  const defaultValue =
    typeof meta["default"] === "number"
      ? (meta["default"] as number)
      : Math.round((min + max) / 2);
  const labelMap = useMemo(() => {
    const raw = meta["labels"];
    if (!raw || typeof raw !== "object") return {} as Record<string, string>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  }, [meta]);

  const current = value ?? defaultValue;

  // Persist default on first render so the answer isn't missing if the user
  // never drags.
  useEffect(() => {
    if (value === null) onChange(defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.key]);

  return (
    <div className="space-y-5">
      <p className="text-center font-serif text-6xl font-bold text-accent">
        {current}
      </p>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={current}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-accent"
      />
      <div className="flex justify-between text-xs text-text-muted">
        <span>{labelMap[String(min)] ?? String(min)}</span>
        {labelMap[String(Math.round((min + max) / 2))] && (
          <span>{labelMap[String(Math.round((min + max) / 2))]}</span>
        )}
        <span>{labelMap[String(max)] ?? String(max)}</span>
      </div>
    </div>
  );
}

// ── Helpers ──

function hasAnswer(
  key: string,
  answers: AnswersMap,
  custom: CustomAnswersMap
): boolean {
  const v = answers[key];
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.length > 0;
  if (typeof v === "number") return true;
  if (v !== undefined && v !== null) return true;
  const c = custom[key];
  return Array.isArray(c) && c.length > 0;
}
