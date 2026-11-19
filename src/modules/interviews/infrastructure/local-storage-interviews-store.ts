import { z } from "zod";
import {
  LocalStorageStore,
  type KeyValueStorage,
  type StorageEventSource,
} from "@/infrastructure/browser/local-storage-store";
import type { ExternalStore } from "@/shared/kernel/external-store";
import { EMPTY_INTERVIEWS, INTERVIEWS_SCHEMA_VERSION, type InterviewsState } from "../domain/history";
import { INTERVIEW_MODES } from "../domain/session";

export const INTERVIEWS_STORAGE_KEY = "eal:interviews";

const isoInstant = z.iso.datetime();

const schema = z.object({
  schemaVersion: z.literal(INTERVIEWS_SCHEMA_VERSION),
  sessions: z.array(
    z.object({
      id: z.string(),
      mode: z.enum(INTERVIEW_MODES),
      startedAt: isoInstant,
      finishedAt: isoInstant,
      plannedMinutes: z.number().nonnegative(),
      elapsedSeconds: z.number().nonnegative(),
      questions: z.array(
        z.object({ questionId: z.string(), covered: z.array(z.string()), missing: z.array(z.string()) }),
      ),
      systemDesign: z
        .object({
          challengeId: z.string(),
          score: z.number().min(0).max(1),
          phasesWithNotes: z.number().int(),
        })
        .optional(),
      liveCoding: z
        .object({
          challengeId: z.string(),
          solved: z.boolean(),
          passed: z.number().int(),
          total: z.number().int(),
        })
        .optional(),
    }),
  ),
  weakPoints: z.record(
    z.string(),
    z.object({
      missing: z.array(z.string()),
      lastAnsweredAt: isoInstant,
      attempts: z.number().int().positive(),
    }),
  ),
});

export function parseStoredInterviews(data: unknown): InterviewsState | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

export function createLocalInterviewsStore(
  storage: KeyValueStorage | null,
  events: StorageEventSource | null = null,
): ExternalStore<InterviewsState> {
  return new LocalStorageStore<InterviewsState>(
    { key: INTERVIEWS_STORAGE_KEY, empty: EMPTY_INTERVIEWS, parse: parseStoredInterviews },
    storage,
    events,
  );
}
