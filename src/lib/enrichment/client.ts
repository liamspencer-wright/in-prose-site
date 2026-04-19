// Data helpers for the enrichment survey flow.
//
// - getActiveTemplate: loads the active version of a named template (questions
//   + options) via the `get_active_survey_template` RPC.
// - getResponse: fetches an existing row from `enrichment_responses` keyed by
//   (user_id, isbn13, template_version_id).
// - upsertResponse: upserts a response on the same unique key.

import { createClient } from "@/lib/supabase/client";
import type {
  AnswersMap,
  CustomAnswersMap,
  EnrichmentResponse,
  SurveyTemplate,
} from "./types";

export type TemplateKey = "enrichment_pre_v1" | "enrichment_v1";

export async function getActiveTemplate(
  key: TemplateKey
): Promise<SurveyTemplate | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_active_survey_template", {
    p_name: key,
  });
  if (error || !data) return null;
  return data as unknown as SurveyTemplate;
}

export async function getResponse(
  userId: string,
  isbn13: string,
  templateVersionId: string
): Promise<EnrichmentResponse | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("enrichment_responses")
    .select("*")
    .eq("user_id", userId)
    .eq("isbn13", isbn13)
    .eq("template_version_id", templateVersionId)
    .maybeSingle();
  return (data as EnrichmentResponse | null) ?? null;
}

type UpsertArgs = {
  userId: string;
  isbn13: string;
  templateVersionId: string;
  answers: AnswersMap;
  answersCustom: CustomAnswersMap;
  cardsShown?: number;
  cardsAnswered?: number;
  cardsSkipped?: number;
  completedAt?: string | null;
};

export async function upsertResponse(args: UpsertArgs): Promise<void> {
  const supabase = createClient();
  const {
    userId,
    isbn13,
    templateVersionId,
    answers,
    answersCustom,
    cardsShown = 0,
    cardsAnswered = 0,
    cardsSkipped = 0,
    completedAt = null,
  } = args;

  await supabase.from("enrichment_responses").upsert(
    {
      user_id: userId,
      isbn13,
      template_version_id: templateVersionId,
      answers: answers as unknown as import("@/types/database").Json,
      answers_custom: answersCustom as unknown as import("@/types/database").Json,
      cards_shown: cardsShown,
      cards_answered: cardsAnswered,
      cards_skipped: cardsSkipped,
      completed_at: completedAt,
    },
    { onConflict: "user_id,isbn13,template_version_id" }
  );
}

// Fetches the pre-read response for a user+book so the post-read flow can
// seed its `expected_vibes` answer and inherit any custom write-ins.
// Returns null when no pre-read template exists or no response was saved.
export async function getPreReadResponseForBook(
  userId: string,
  isbn13: string
): Promise<{
  expectedVibes: string[] | null;
  customExpectedVibes: string[];
} | null> {
  const preTemplate = await getActiveTemplate("enrichment_pre_v1");
  if (!preTemplate) return null;

  const response = await getResponse(userId, isbn13, preTemplate.version_id);
  if (!response) return null;

  const raw = response.answers?.expected_vibes;
  const expectedVibes = Array.isArray(raw)
    ? (raw as string[])
    : typeof raw === "string"
      ? [raw]
      : null;

  const custom = response.answers_custom?.expected_vibes;
  const customExpectedVibes = Array.isArray(custom) ? custom : [];

  return { expectedVibes, customExpectedVibes };
}
