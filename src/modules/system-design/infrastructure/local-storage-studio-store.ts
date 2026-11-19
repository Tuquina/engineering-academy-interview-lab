import { z } from "zod";
import {
  LocalStorageStore,
  type KeyValueStorage,
  type StorageEventSource,
} from "@/infrastructure/browser/local-storage-store";
import type { ExternalStore } from "@/shared/kernel/external-store";
import { designDocumentSchema } from "../application/design-schema";
import { EMPTY_STUDIO, MAX_NOTES, STUDIO_SCHEMA_VERSION, type StudioState } from "../domain/studio";

export const STUDIO_STORAGE_KEY = "eal:studio";

const studioSchema = z.object({
  schemaVersion: z.literal(STUDIO_SCHEMA_VERSION),
  documents: z.record(z.string(), designDocumentSchema),
  challengeWork: z.record(
    z.string(),
    z.object({
      notes: z.record(z.string(), z.string().max(MAX_NOTES)),
      checklist: z.array(z.string()),
      rubric: z.array(z.string()),
      updatedAt: z.iso.datetime(),
    }),
  ),
});

export function parseStoredStudio(data: unknown): StudioState | null {
  const result = studioSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function createLocalStudioStore(
  storage: KeyValueStorage | null,
  events: StorageEventSource | null = null,
): ExternalStore<StudioState> {
  return new LocalStorageStore<StudioState>(
    { key: STUDIO_STORAGE_KEY, empty: EMPTY_STUDIO, parse: parseStoredStudio },
    storage,
    events,
  );
}
