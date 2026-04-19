"use client";

import { useCallback, useState } from "react";
import { EnrichmentSheet } from "@/components/enrichment/enrichment-sheet";
import {
  getActiveTemplate,
  getPreReadResponseForBook,
  getResponse,
  type TemplateKey,
} from "./client";
import type { AnswersMap, CustomAnswersMap } from "./types";

// Shared trigger hook for pre- and post-read enrichment flows.
//
// Callers invoke `maybeOpen(prev, next)` after a user changes a book's
// status. The hook decides whether to open the relevant sheet based on:
//   - status transition from `prev` → `next` (ignores same-state loads)
//   - whether a response already exists for the matching template
//   - fetches pre-read response + customs to seed the post-read sheet
//
// Rendering the sheet is handled by the hook itself: callers spread `sheet`
// into their JSX and let the overlay do the rest.

type SheetState =
  | null
  | {
      templateKey: TemplateKey;
      initialAnswers?: AnswersMap;
      initialAnswersCustom?: CustomAnswersMap;
    };

export function useEnrichmentTrigger(args: {
  isbn13: string;
  userId: string | null;
}) {
  const { isbn13, userId } = args;
  const [state, setState] = useState<SheetState>(null);

  const close = useCallback(() => setState(null), []);

  const maybeOpen = useCallback(
    async (prevStatus: string | null, nextStatus: string) => {
      if (!userId) return;
      // Only act on actual transitions — ignore first-load pre-fill where
      // prev === next.
      if (prevStatus === nextStatus) return;

      if (nextStatus === "reading") {
        const template = await getActiveTemplate("enrichment_pre_v1");
        if (!template) return;
        const existing = await getResponse(userId, isbn13, template.version_id);
        if (existing) return;
        setState({ templateKey: "enrichment_pre_v1" });
        return;
      }

      if (nextStatus === "finished") {
        const template = await getActiveTemplate("enrichment_v1");
        if (!template) return;
        const existing = await getResponse(userId, isbn13, template.version_id);
        if (existing) return;
        // Seed expected_vibes + customs from the pre-read response.
        const pre = await getPreReadResponseForBook(userId, isbn13);
        const initialAnswers: AnswersMap = {};
        const initialAnswersCustom: CustomAnswersMap = {};
        if (pre?.expectedVibes && pre.expectedVibes.length > 0) {
          initialAnswers.expected_vibes = pre.expectedVibes;
        }
        if (pre && pre.customExpectedVibes.length > 0) {
          initialAnswersCustom.expected_vibes = pre.customExpectedVibes;
        }
        setState({
          templateKey: "enrichment_v1",
          initialAnswers:
            Object.keys(initialAnswers).length > 0 ? initialAnswers : undefined,
          initialAnswersCustom:
            Object.keys(initialAnswersCustom).length > 0
              ? initialAnswersCustom
              : undefined,
        });
      }
    },
    [userId, isbn13]
  );

  const sheet =
    state && userId ? (
      <EnrichmentSheet
        isbn13={isbn13}
        userId={userId}
        templateKey={state.templateKey}
        initialAnswers={state.initialAnswers}
        initialAnswersCustom={state.initialAnswersCustom}
        onClose={close}
      />
    ) : null;

  return { sheet, maybeOpen, close };
}
