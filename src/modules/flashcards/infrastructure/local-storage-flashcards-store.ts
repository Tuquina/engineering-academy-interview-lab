import { z } from "zod";
import {
  LocalStorageStore,
  type KeyValueStorage,
  type StorageEventSource,
} from "@/infrastructure/browser/local-storage-store";
import type { ExternalStore } from "@/shared/kernel/external-store";
import {
  EMPTY_FLASHCARDS,
  FLASHCARDS_SCHEMA_VERSION,
  MIN_EASE_FACTOR,
  type FlashcardsState,
} from "../domain/spaced-repetition";

export const FLASHCARDS_STORAGE_KEY = "eal:flashcards";

const isoInstant = z.iso.datetime();
const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const flashcardsSchema = z.object({
  schemaVersion: z.literal(FLASHCARDS_SCHEMA_VERSION),
  schedules: z.record(
    z.string(),
    z.object({
      repetitions: z.number().int().nonnegative(),
      easeFactor: z.number().min(MIN_EASE_FACTOR),
      intervalDays: z.number().nonnegative(),
      dueAt: isoInstant,
      lastReviewedAt: isoInstant,
      firstReviewedDay: dayKey,
      lapses: z.number().int().nonnegative(),
      reviews: z.number().int().positive(),
    }),
  ),
  reviewsByDay: z.record(dayKey, z.number().int().nonnegative()),
});

export function parseStoredFlashcards(data: unknown): FlashcardsState | null {
  const result = flashcardsSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function createLocalFlashcardsStore(
  storage: KeyValueStorage | null,
  events: StorageEventSource | null = null,
): ExternalStore<FlashcardsState> {
  return new LocalStorageStore<FlashcardsState>(
    { key: FLASHCARDS_STORAGE_KEY, empty: EMPTY_FLASHCARDS, parse: parseStoredFlashcards },
    storage,
    events,
  );
}
