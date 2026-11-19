import {
  LocalStorageStore,
  type KeyValueStorage,
  type StorageEventSource,
} from "@/infrastructure/browser/local-storage-store";
import type { ExternalStore } from "@/shared/kernel/external-store";
import { parseAgentLabState } from "../application/agent-lab-schemas";
import { EMPTY_AGENT_LAB, type AgentLabState } from "../domain/agent-lab-state";

export const AGENT_LAB_STORAGE_KEY = "eal:agent-lab";

export function createLocalAgentLabStore(
  storage: KeyValueStorage | null,
  events: StorageEventSource | null = null,
): ExternalStore<AgentLabState> {
  return new LocalStorageStore<AgentLabState>(
    { key: AGENT_LAB_STORAGE_KEY, empty: EMPTY_AGENT_LAB, parse: parseAgentLabState },
    storage,
    events,
  );
}
