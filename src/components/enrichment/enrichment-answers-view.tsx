"use client";

import type {
  AnswersMap,
  CustomAnswersMap,
  SurveyTemplate,
} from "@/lib/enrichment/types";

// Read-only summary of a user's enrichment answers against a template version.
// Used in two places: the "Your take" block on the user's own book detail,
// and friend review cards in the Community tab. Renders nothing when neither
// answers nor custom write-ins are populated.

type Props = {
  template: SurveyTemplate;
  answers: AnswersMap;
  answersCustom?: CustomAnswersMap;
  title?: string;
  onEdit?: () => void;
};

function isNonEmptyAnswer(
  v: AnswersMap[string] | undefined,
  custom: string[] | undefined
): boolean {
  if (Array.isArray(v) && v.length > 0) return true;
  if (typeof v === "string" && v.length > 0) return true;
  if (typeof v === "number") return true;
  if (Array.isArray(custom) && custom.length > 0) return true;
  return false;
}

export function EnrichmentAnswersView({
  template,
  answers,
  answersCustom = {},
  title,
  onEdit,
}: Props) {
  const rows = template.questions
    .filter((q) => isNonEmptyAnswer(answers[q.key], answersCustom[q.key]))
    .sort((a, b) => a.position - b.position);

  if (rows.length === 0) return null;

  return (
    <section>
      {(title || onEdit) && (
        <div className="mb-3 flex items-baseline justify-between gap-2">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {onEdit && (
            <button
              onClick={onEdit}
              className="cursor-pointer text-sm font-semibold text-accent hover:underline"
            >
              Edit
            </button>
          )}
        </div>
      )}
      <div className="space-y-4 rounded-(--radius-card) bg-bg-medium p-5">
        {rows.map((q) => {
          const labelMap: Record<string, string> = {};
          for (const o of q.options) labelMap[o.value] = o.label;

          const answer = answers[q.key];
          const customs = answersCustom[q.key] ?? [];

          return (
            <div key={q.id}>
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-text-subtle uppercase">
                {q.prompt}
              </p>
              {q.kind === "slider" && typeof answer === "number" && (
                <p className="text-lg font-bold text-accent">{answer}</p>
              )}
              {q.kind === "single_select" && typeof answer === "string" && (
                <div className="flex flex-wrap gap-2">
                  <Pill label={labelMap[answer] ?? answer} />
                  {customs.map((c) => (
                    <Pill key={c} label={c} custom />
                  ))}
                </div>
              )}
              {q.kind === "multi_select" && Array.isArray(answer) && (
                <div className="flex flex-wrap gap-2">
                  {answer.map((v) => (
                    <Pill key={v} label={labelMap[v] ?? v} />
                  ))}
                  {customs.map((c) => (
                    <Pill key={c} label={c} custom />
                  ))}
                </div>
              )}
              {/* Edge case: only customs present (question skipped but user
                  typed a write-in). Render the customs without presets. */}
              {(answer === undefined || answer === null) && customs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customs.map((c) => (
                    <Pill key={c} label={c} custom />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Pill({ label, custom }: { label: string; custom?: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        custom
          ? "border border-accent/40 bg-white italic text-accent"
          : "bg-accent/10 text-accent"
      }`}
    >
      {label}
    </span>
  );
}
