"use client";

import { useMemo } from "react";
import { createStoreContext } from "@/shared/lib/create-store-context";
import {
  EMPTY_NOTEBOOK,
  saveNote,
  toggleBookmark,
  toggleFavoriteCheatsheet,
  type NotebookState,
} from "../domain/notebook";

const notebookContext = createStoreContext<NotebookState>("Notebook", EMPTY_NOTEBOOK);

export const NotebookProvider = notebookContext.Provider;
export const useNotebookState = notebookContext.useStoreState;

export function useNotebookActions() {
  const store = notebookContext.useStore();
  return useMemo(
    () => ({
      saveNote: (lessonId: string, text: string) =>
        store.update((s) => saveNote(s, lessonId, text, new Date())),
      toggleBookmark: (lessonId: string) => store.update((s) => toggleBookmark(s, lessonId, new Date())),
      toggleFavoriteCheatsheet: (slug: string) =>
        store.update((s) => toggleFavoriteCheatsheet(s, slug, new Date())),
    }),
    [store],
  );
}
