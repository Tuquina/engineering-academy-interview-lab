"use client";

import { useMemo } from "react";
import { createStoreContext } from "@/shared/lib/create-store-context";
import type { DesignDocument } from "../domain/canvas";
import {
  EMPTY_STUDIO,
  deleteDocument,
  resetChallengeWork,
  saveChallengeWork,
  saveDocument,
  type StudioState,
} from "../domain/studio";

const studioContext = createStoreContext<StudioState>("Studio", EMPTY_STUDIO);

export const StudioProvider = studioContext.Provider;
export const useStudioState = studioContext.useStoreState;

export function useStudioActions() {
  const store = studioContext.useStore();
  return useMemo(
    () => ({
      saveDocument: (doc: DesignDocument) => store.update((s) => saveDocument(s, doc)),
      deleteDocument: (docId: string) => store.update((s) => deleteDocument(s, docId)),
      resetChallengeWork: (key: string, documentId: string) =>
        store.update((s) => resetChallengeWork(s, key, documentId)),
      saveChallengeWork: (
        challengeId: string,
        patch: { notes?: Record<string, string>; checklist?: readonly string[]; rubric?: readonly string[] },
      ) => store.update((s) => saveChallengeWork(s, challengeId, patch, new Date())),
    }),
    [store],
  );
}
