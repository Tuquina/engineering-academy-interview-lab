import { z } from "zod";
import {
  LocalStorageStore,
  type KeyValueStorage,
  type StorageEventSource,
} from "@/infrastructure/browser/local-storage-store";
import type { ProgressStore } from "../application/progress-store";
import { EMPTY_PROGRESS, PROGRESS_SCHEMA_VERSION, type ProgressState } from "../domain/progress";

export const PROGRESS_STORAGE_KEY = "eal:progress";

const isoInstant = z.iso.datetime();
const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const lessonV1 = z.object({
  status: z.enum(["in_progress", "completed"]),
  startedAt: isoInstant,
  lastVisitedAt: isoInstant,
  completedAt: isoInstant.nullable(),
});

const progressV1Schema = z.object({
  schemaVersion: z.literal(1),
  lessons: z.record(z.string(), lessonV1),
});

const progressV2Schema = z.object({
  schemaVersion: z.literal(PROGRESS_SCHEMA_VERSION),
  lessons: z.record(z.string(), lessonV1.extend({ lastSectionId: z.string().nullable() })),
  questions: z.record(
    z.string(),
    z.object({
      lessonId: z.string(),
      attempts: z.number().int().positive(),
      correctAttempts: z.number().int().nonnegative(),
      lastAnsweredAt: isoInstant,
      lastCorrect: z.boolean(),
    }),
  ),
  studySeconds: z.record(dayKey, z.number().nonnegative()),
});

/**
 * Valida el estado almacenado y migra versiones anteriores.
 *
 * - v1 → v2: agrega `questions`, `studySeconds` y `lastSectionId` sin perder el progreso de lecciones.
 * - Cualquier otro formato se considera irrecuperable (`null`).
 */
export function parseStoredProgress(data: unknown): ProgressState | null {
  const current = progressV2Schema.safeParse(data);
  if (current.success) return current.data;

  const v1 = progressV1Schema.safeParse(data);
  if (v1.success) {
    const lessons = Object.fromEntries(
      Object.entries(v1.data.lessons).map(([id, lesson]) => [id, { ...lesson, lastSectionId: null }]),
    );
    return { ...EMPTY_PROGRESS, lessons };
  }
  return null;
}

/** Crea el store de progreso del modo invitado sobre `localStorage`. */
export function createLocalProgressStore(
  storage: KeyValueStorage | null,
  events: StorageEventSource | null = null,
): ProgressStore {
  return new LocalStorageStore<ProgressState>(
    { key: PROGRESS_STORAGE_KEY, empty: EMPTY_PROGRESS, parse: parseStoredProgress },
    storage,
    events,
  );
}
