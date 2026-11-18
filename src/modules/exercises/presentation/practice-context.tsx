"use client";

import { useMemo } from "react";
import { createStoreContext } from "@/shared/lib/create-store-context";
import {
  EMPTY_PRACTICE,
  markSolutionRevealed,
  recordAttempt,
  saveDesignAnswer,
  saveDraft,
  type PracticeState,
} from "../domain/practice";

const practiceContext = createStoreContext<PracticeState>("Practice", EMPTY_PRACTICE);

export const PracticeProvider = practiceContext.Provider;
export const usePracticeState = practiceContext.useStoreState;

export function usePracticeActions() {
  const store = practiceContext.useStore();
  return useMemo(
    () => ({
      recordAttempt: (exerciseId: string, outcome: { passed: number; total: number; solved?: boolean }) =>
        store.update((s) => recordAttempt(s, exerciseId, outcome, new Date())),
      saveDraft: (exerciseId: string, code: string) => store.update((s) => saveDraft(s, exerciseId, code)),
      saveDesignAnswer: (
        challengeId: string,
        answer: { answer?: string; checkedCriteria?: readonly string[] },
      ) => store.update((s) => saveDesignAnswer(s, challengeId, answer, new Date())),
      markSolutionRevealed: (exerciseId: string) => store.update((s) => markSolutionRevealed(s, exerciseId)),
    }),
    [store],
  );
}
