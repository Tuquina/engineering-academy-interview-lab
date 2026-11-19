import { parseAgentLabState } from "@/modules/agent-lab/application/agent-lab-schemas";
import { EMPTY_AGENT_LAB, type AgentLabState } from "@/modules/agent-lab/domain/agent-lab-state";
import { createLocalAgentLabStore } from "@/modules/agent-lab/infrastructure/local-storage-agent-lab-store";
import { EMPTY_PRACTICE, type PracticeState } from "@/modules/exercises/domain/practice";
import {
  createLocalPracticeStore,
  parseStoredPractice,
} from "@/modules/exercises/infrastructure/local-storage-practice-store";
import { EMPTY_INTERVIEWS, type InterviewsState } from "@/modules/interviews/domain/history";
import {
  createLocalInterviewsStore,
  parseStoredInterviews,
} from "@/modules/interviews/infrastructure/local-storage-interviews-store";
import {
  createLocalFlashcardsStore,
  parseStoredFlashcards,
} from "@/modules/flashcards/infrastructure/local-storage-flashcards-store";
import { EMPTY_FLASHCARDS, type FlashcardsState } from "@/modules/flashcards/domain/spaced-repetition";
import { EMPTY_NOTEBOOK, type NotebookState } from "@/modules/notebook/domain/notebook";
import {
  createLocalNotebookStore,
  parseStoredNotebook,
} from "@/modules/notebook/infrastructure/local-storage-notebook-store";
import { DEFAULT_PREFERENCES, type PreferencesState } from "@/modules/preferences/domain/preferences";
import {
  createLocalPreferencesStore,
  parseStoredPreferences,
} from "@/modules/preferences/infrastructure/local-storage-preferences-store";
import { EMPTY_PROGRESS, type ProgressState } from "@/modules/progress/domain/progress";
import {
  createLocalProgressStore,
  parseStoredProgress,
} from "@/modules/progress/infrastructure/local-storage-progress-store";
import type { SyncStoreKey } from "@/modules/sync/application/user-documents";
import { UserDataBackup, type UserDataBackupPort } from "@/modules/sync/application/user-data-backup";
import { HttpSyncGateway, SyncManager } from "@/modules/sync/infrastructure/sync-manager";
import { SyncedStore } from "@/modules/sync/infrastructure/synced-store";
import { EMPTY_STUDIO, type StudioState } from "@/modules/system-design/domain/studio";
import {
  createLocalStudioStore,
  parseStoredStudio,
} from "@/modules/system-design/infrastructure/local-storage-studio-store";
import type { ExternalStore } from "@/shared/kernel/external-store";
import { createServerSnapshotStore } from "../browser/local-storage-store";

/** Stores de cliente de toda la aplicación. */
export interface ClientStores {
  readonly progress: ExternalStore<ProgressState>;
  readonly notebook: ExternalStore<NotebookState>;
  readonly flashcards: ExternalStore<FlashcardsState>;
  readonly preferences: ExternalStore<PreferencesState>;
  readonly practice: ExternalStore<PracticeState>;
  readonly studio: ExternalStore<StudioState>;
  readonly interviews: ExternalStore<InterviewsState>;
  readonly agentLab: ExternalStore<AgentLabState>;
  /** `null` durante el render en servidor. */
  readonly sync: SyncManager | null;
  /** Exportación e importación de los datos del usuario; `null` durante el render en servidor. */
  readonly backup: UserDataBackupPort | null;
}

let browserStores: ClientStores | null = null;

/**
 * Raíz de composición del estado de cliente.
 *
 * En el navegador, cada store vive en `localStorage` (modo invitado, funciona sin red) envuelto en un `SyncedStore`:
 * con una sesión iniciada, el `SyncManager` lo replica en PostgreSQL (Fase 6, ADR-0010). Durante el render en
 * servidor devuelve stores sin persistencia con el estado vacío.
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
      sync: null,
      backup: null,
    };
  }
  if (!browserStores) {
    const storage = safeLocalStorage();
    const meta = storage ?? memoryStorage();
    const synced = <T>(
      key: SyncStoreKey,
      inner: ExternalStore<T>,
      empty: T,
      parse: (data: unknown) => T | null,
    ) => new SyncedStore<T>(key, inner, empty, parse, meta);

    const stores = {
      progress: synced(
        "progress",
        createLocalProgressStore(storage, window),
        EMPTY_PROGRESS,
        parseStoredProgress,
      ),
      notebook: synced(
        "notebook",
        createLocalNotebookStore(storage, window),
        EMPTY_NOTEBOOK,
        parseStoredNotebook,
      ),
      flashcards: synced(
        "flashcards",
        createLocalFlashcardsStore(storage, window),
        EMPTY_FLASHCARDS,
        parseStoredFlashcards,
      ),
      preferences: synced(
        "preferences",
        createLocalPreferencesStore(storage, window),
        DEFAULT_PREFERENCES,
        parseStoredPreferences,
      ),
      practice: synced(
        "practice",
        createLocalPracticeStore(storage, window),
        EMPTY_PRACTICE,
        parseStoredPractice,
      ),
      studio: synced("studio", createLocalStudioStore(storage, window), EMPTY_STUDIO, parseStoredStudio),
      interviews: synced(
        "interviews",
        createLocalInterviewsStore(storage, window),
        EMPTY_INTERVIEWS,
        parseStoredInterviews,
      ),
      agentLab: synced(
        "agentLab",
        createLocalAgentLabStore(storage, window),
        EMPTY_AGENT_LAB,
        parseAgentLabState,
      ),
    };
    const list = Object.values(stores) as SyncedStore<unknown>[];
    browserStores = {
      ...stores,
      sync: new SyncManager(list, new HttpSyncGateway()),
      backup: new UserDataBackup(list),
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

function memoryStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}
