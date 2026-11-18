import { z } from "zod";
import {
  LocalStorageStore,
  type KeyValueStorage,
  type StorageEventSource,
} from "@/infrastructure/browser/local-storage-store";
import type { ExternalStore } from "@/shared/kernel/external-store";
import {
  DEFAULT_PREFERENCES,
  NEW_CARDS_PER_DAY_RANGE,
  PREFERENCES_SCHEMA_VERSION,
  type PreferencesState,
} from "../domain/preferences";

/** Clave compartida con el script de inicio que aplica el tamaño de lectura antes del primer pintado. */
export const PREFERENCES_STORAGE_KEY = "eal:preferences";

const preferencesSchema = z.object({
  schemaVersion: z.literal(PREFERENCES_SCHEMA_VERSION),
  readingFontSize: z.enum(["sm", "md", "lg"]),
  activePathId: z.string().nullable(),
  newFlashcardsPerDay: z.number().int().min(NEW_CARDS_PER_DAY_RANGE.min).max(NEW_CARDS_PER_DAY_RANGE.max),
});

export function parseStoredPreferences(data: unknown): PreferencesState | null {
  const result = preferencesSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function createLocalPreferencesStore(
  storage: KeyValueStorage | null,
  events: StorageEventSource | null = null,
): ExternalStore<PreferencesState> {
  return new LocalStorageStore<PreferencesState>(
    { key: PREFERENCES_STORAGE_KEY, empty: DEFAULT_PREFERENCES, parse: parseStoredPreferences },
    storage,
    events,
  );
}
