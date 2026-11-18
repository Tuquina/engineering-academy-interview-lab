"use client";

import { useMemo } from "react";
import { toDayKey } from "@/shared/kernel/day-key";
import { createStoreContext } from "@/shared/lib/create-store-context";
import {
  EMPTY_FLASHCARDS,
  recordReview,
  type FlashcardsState,
  type Grade,
} from "../domain/spaced-repetition";

const flashcardsContext = createStoreContext<FlashcardsState>("Flashcards", EMPTY_FLASHCARDS);

export const FlashcardsProvider = flashcardsContext.Provider;
export const useFlashcardsState = flashcardsContext.useStoreState;

export function useFlashcardsActions() {
  const store = flashcardsContext.useStore();
  return useMemo(
    () => ({
      review: (cardId: string, grade: Grade) => {
        const now = new Date();
        store.update((s) => recordReview(s, cardId, grade, now, toDayKey(now)));
      },
    }),
    [store],
  );
}
