import { z } from "zod";
import {
  LocalStorageStore,
  type KeyValueStorage,
  type StorageEventSource,
} from "@/infrastructure/browser/local-storage-store";
import type { ExternalStore } from "@/shared/kernel/external-store";
import {
  EMPTY_PRACTICE,
  MAX_DRAFT_LENGTH,
  PRACTICE_SCHEMA_VERSION,
  type PracticeState,
} from "../domain/practice";

export const PRACTICE_STORAGE_KEY = "eal:practice";

const isoInstant = z.iso.datetime();

const practiceSchema = z.object({
  schemaVersion: z.literal(PRACTICE_SCHEMA_VERSION),
  attempts: z.record(
    z.string(),
    z.object({
      attempts: z.number().int().positive(),
      lastRunAt: isoInstant,
      solvedAt: isoInstant.nullable(),
      bestPassed: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
    }),
  ),
  drafts: z.record(z.string(), z.string().max(MAX_DRAFT_LENGTH)),
  design: z.record(
    z.string(),
    z.object({
      answer: z.string().max(MAX_DRAFT_LENGTH),
      checkedCriteria: z.array(z.string()),
      updatedAt: isoInstant,
    }),
  ),
  solutionsRevealed: z.array(z.string()),
});

export function parseStoredPractice(data: unknown): PracticeState | null {
  const result = practiceSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function createLocalPracticeStore(
  storage: KeyValueStorage | null,
  events: StorageEventSource | null = null,
): ExternalStore<PracticeState> {
  return new LocalStorageStore<PracticeState>(
    { key: PRACTICE_STORAGE_KEY, empty: EMPTY_PRACTICE, parse: parseStoredPractice },
    storage,
    events,
  );
}
