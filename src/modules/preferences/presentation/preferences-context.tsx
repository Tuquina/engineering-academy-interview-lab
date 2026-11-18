"use client";

import { useEffect, useMemo } from "react";
import { createStoreContext } from "@/shared/lib/create-store-context";
import { DEFAULT_PREFERENCES, updatePreferences, type PreferencesState } from "../domain/preferences";

const preferencesContext = createStoreContext<PreferencesState>("Preferences", DEFAULT_PREFERENCES);

export const PreferencesProvider = preferencesContext.Provider;
export const usePreferences = preferencesContext.useStoreState;

export function usePreferencesActions() {
  const store = preferencesContext.useStore();
  return useMemo(
    () => ({
      update: (changes: Partial<Omit<PreferencesState, "schemaVersion">>) =>
        store.update((s) => updatePreferences(s, changes)),
    }),
    [store],
  );
}

/**
 * Refleja el tamaño de lectura en `<html data-font-size>` cuando cambia la preferencia. El valor inicial lo aplica
 * el script de arranque antes del primer pintado; este efecto mantiene la sincronía después.
 */
export function ReadingFontSizeSync() {
  const { readingFontSize } = usePreferences();
  useEffect(() => {
    document.documentElement.dataset.fontSize = readingFontSize;
  }, [readingFontSize]);
  return null;
}
