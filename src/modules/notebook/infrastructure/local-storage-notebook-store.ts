import { z } from "zod";
import {
  LocalStorageStore,
  type KeyValueStorage,
  type StorageEventSource,
} from "@/infrastructure/browser/local-storage-store";
import type { ExternalStore } from "@/shared/kernel/external-store";
import {
  EMPTY_NOTEBOOK,
  MAX_NOTE_LENGTH,
  NOTEBOOK_SCHEMA_VERSION,
  type NotebookState,
} from "../domain/notebook";

export const NOTEBOOK_STORAGE_KEY = "eal:notebook";

const isoInstant = z.iso.datetime();

const notebookSchema = z.object({
  schemaVersion: z.literal(NOTEBOOK_SCHEMA_VERSION),
  notes: z.record(z.string(), z.object({ text: z.string().max(MAX_NOTE_LENGTH), updatedAt: isoInstant })),
  bookmarks: z.record(z.string(), z.object({ createdAt: isoInstant })),
  // Agregado después de la v1: los datos guardados antes no lo tienen y se completan con un objeto vacío.
  favoriteCheatsheets: z.record(z.string(), z.object({ createdAt: isoInstant })).default({}),
});

export function parseStoredNotebook(data: unknown): NotebookState | null {
  const result = notebookSchema.safeParse(data);
  return result.success ? result.data : null;
}

/** Crea el store del cuaderno (notas y marcadores) sobre `localStorage`. */
export function createLocalNotebookStore(
  storage: KeyValueStorage | null,
  events: StorageEventSource | null = null,
): ExternalStore<NotebookState> {
  return new LocalStorageStore<NotebookState>(
    { key: NOTEBOOK_STORAGE_KEY, empty: EMPTY_NOTEBOOK, parse: parseStoredNotebook },
    storage,
    events,
  );
}
