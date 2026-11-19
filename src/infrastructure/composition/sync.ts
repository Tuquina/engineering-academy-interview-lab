import { parseAgentLabState } from "@/modules/agent-lab/application/agent-lab-schemas";
import { parseStoredPractice } from "@/modules/exercises/infrastructure/local-storage-practice-store";
import { parseStoredFlashcards } from "@/modules/flashcards/infrastructure/local-storage-flashcards-store";
import { parseStoredInterviews } from "@/modules/interviews/infrastructure/local-storage-interviews-store";
import { parseStoredNotebook } from "@/modules/notebook/infrastructure/local-storage-notebook-store";
import { parseStoredPreferences } from "@/modules/preferences/infrastructure/local-storage-preferences-store";
import { parseStoredProgress } from "@/modules/progress/infrastructure/local-storage-progress-store";
import { UserDocumentService, type SyncStoreKey } from "@/modules/sync/application/user-documents";
import { DrizzleUserDocumentRepository } from "@/modules/sync/infrastructure/drizzle-user-document-repository";
import { parseStoredStudio } from "@/modules/system-design/infrastructure/local-storage-studio-store";
import { getDatabase } from "./database";

/**
 * El servidor valida cada documento con el mismo esquema que usa el navegador al leer `localStorage`: un cliente
 * modificado no puede guardar datos con otra forma.
 */
const VALIDATORS: Record<SyncStoreKey, (data: unknown) => unknown> = {
  progress: parseStoredProgress,
  notebook: parseStoredNotebook,
  flashcards: parseStoredFlashcards,
  preferences: parseStoredPreferences,
  practice: parseStoredPractice,
  studio: parseStoredStudio,
  interviews: parseStoredInterviews,
  agentLab: parseAgentLabState,
};

export function getUserDocumentService(): UserDocumentService | null {
  const db = getDatabase();
  if (!db) return null;
  return new UserDocumentService(new DrizzleUserDocumentRepository(db), (key, data) => VALIDATORS[key](data));
}
