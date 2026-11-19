import { EMPTY_AGENT_LAB, type AgentLabState } from "@/modules/agent-lab/domain/agent-lab-state";
import { createLocalAgentLabStore } from "@/modules/agent-lab/infrastructure/local-storage-agent-lab-store";
import { EMPTY_PRACTICE, type PracticeState } from "@/modules/exercises/domain/practice";
import { createLocalPracticeStore } from "@/modules/exercises/infrastructure/local-storage-practice-store";
import { EMPTY_INTERVIEWS, type InterviewsState } from "@/modules/interviews/domain/history";
import { createLocalInterviewsStore } from "@/modules/interviews/infrastructure/local-storage-interviews-store";
import { createLocalFlashcardsStore } from "@/modules/flashcards/infrastructure/local-storage-flashcards-store";
import { EMPTY_FLASHCARDS, type FlashcardsState } from "@/modules/flashcards/domain/spaced-repetition";
import { EMPTY_NOTEBOOK, type NotebookState } from "@/modules/notebook/domain/notebook";
import { createLocalNotebookStore } from "@/modules/notebook/infrastructure/local-storage-notebook-store";
import { DEFAULT_PREFERENCES, type PreferencesState } from "@/modules/preferences/domain/preferences";
import { createLocalPreferencesStore } from "@/modules/preferences/infrastructure/local-storage-preferences-store";
import { EMPTY_PROGRESS, type ProgressState } from "@/modules/progress/domain/progress";
import { createLocalProgressStore } from "@/modules/progress/infrastructure/local-storage-progress-store";
import { EMPTY_STUDIO, type StudioState } from "@/modules/system-design/domain/studio";
import { createLocalStudioStore } from "@/modules/system-design/infrastructure/local-storage-studio-store";
import type { ExternalStore } from "@/shared/kernel/external-store";
import { createServerSnapshotStore } from "../browser/local-storage-store";

/** Stores de cliente de toda la aplicación (modo invitado). */
export interface ClientStores {
  readonly progress: ExternalStore<ProgressState>;
  readonly notebook: ExternalStore<NotebookState>;
  readonly flashcards: ExternalStore<FlashcardsState>;
  readonly preferences: ExternalStore<PreferencesState>;
  readonly practice: ExternalStore<PracticeState>;
  readonly studio: ExternalStore<StudioState>;
  readonly interviews: ExternalStore<InterviewsState>;
  readonly agentLab: ExternalStore<AgentLabState>;
}

let browserStores: ClientStores | null = null;

/**
 * Raíz de composición del estado de cliente.
 *
 * En el navegador crea una única instancia por store sobre `localStorage`; durante el render en servidor devuelve
 * stores sin persistencia que informan el estado vacío (el cliente los reemplaza tras la hidratación).
 * En la Fase 6, este es el punto donde se elegirá entre almacenamiento local y la API autenticada.
 */
export function getClientStores(): ClientStores {
  if (typeof window === "undefined") {
    return {
      progress: createServerSnapshotStore(EMPTY_PROGRESS),
      notebook: createServerSnapshotStore(EMPTY_NOTEBOOK),
      flashcards: createServerSnapshotStore(EMPTY_FLASHCARDS),
      preferences: createServerSnapshotStore(DEFAULT_PREFERENCES),
      practice: createServerSnapshotStore(EMPTY_PRACTICE),
      studio: createServerSnapshotStore(EMPTY_STUDIO),
      interviews: createServerSnapshotStore(EMPTY_INTERVIEWS),
      agentLab: createServerSnapshotStore(EMPTY_AGENT_LAB),
    };
  }
  if (!browserStores) {
    const storage = safeLocalStorage();
    browserStores = {
      progress: createLocalProgressStore(storage, window),
      notebook: createLocalNotebookStore(storage, window),
      flashcards: createLocalFlashcardsStore(storage, window),
      preferences: createLocalPreferencesStore(storage, window),
      practice: createLocalPracticeStore(storage, window),
      studio: createLocalStudioStore(storage, window),
      interviews: createLocalInterviewsStore(storage, window),
      agentLab: createLocalAgentLabStore(storage, window),
    };
  }
  return browserStores;
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
