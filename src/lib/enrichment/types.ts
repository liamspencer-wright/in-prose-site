// Shared types for the enrichment survey flow.
//
// These shapes match the payload returned by the `get_active_survey_template`
// RPC and the `enrichment_responses` table row. Template data is polymorphic
// per question kind — discriminated unions keep the per-card rendering honest.

export type SurveyQuestionKind = "single_select" | "multi_select" | "slider";

export type SurveyOption = {
  id: string;
  position: number;
  value: string;
  label: string;
  metadata: Record<string, unknown>;
};

export type SurveyQuestion = {
  id: string;
  position: number;
  key: string;
  prompt: string;
  kind: SurveyQuestionKind;
  is_required: boolean;
  allow_custom: boolean;
  metadata: Record<string, unknown>;
  options: SurveyOption[];
};

export type SurveyTemplate = {
  template_id: string;
  name: string;
  version_id: string;
  version: number;
  notes: string | null;
  questions: SurveyQuestion[];
};

// Per-question answer shape is polymorphic. Keyed by question.key.
// `string` for single_select, `string[]` for multi_select, `number` for slider.
export type AnswerValue = string | string[] | number | null;

export type AnswersMap = Record<string, AnswerValue>;

// Custom free-text write-ins for questions with `allow_custom`. Always an
// array of strings keyed by question.key.
export type CustomAnswersMap = Record<string, string[]>;

export type EnrichmentResponse = {
  id: string;
  user_id: string;
  isbn13: string;
  template_version_id: string;
  answers: AnswersMap;
  answers_custom: CustomAnswersMap;
  cards_shown: number;
  cards_answered: number;
  cards_skipped: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};
