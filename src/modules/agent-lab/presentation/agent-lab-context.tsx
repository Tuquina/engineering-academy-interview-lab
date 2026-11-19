"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createStoreContext } from "@/shared/lib/create-store-context";
import type { Judge } from "../application/run-evals";
import type { LlmProvider } from "../application/llm-provider";
import type { AgentConfig } from "../domain/agent-config";
import {
  EMPTY_AGENT_LAB,
  deleteAgent,
  deleteCustomCase,
  publishWithGate,
  recordEvalRun,
  restoreExamples,
  saveAgent,
  saveCustomCase,
  setGate,
  type AgentLabState,
  type EvalRunRecord,
} from "../domain/agent-lab-state";
import {
  createAgent,
  restoreDraftFrom,
  saveVersion,
  updateDraft,
  type AgentRecord,
} from "../domain/agent-registry";
import type { EvalCase, QualityGate } from "../domain/evaluation";

const agentLabContext = createStoreContext<AgentLabState>("AgentLab", EMPTY_AGENT_LAB);

export const AgentLabProvider = agentLabContext.Provider;
export const useAgentLabState = agentLabContext.useStoreState;

/** Acciones sobre el laboratorio. Las que pueden violar reglas lanzan `AgentRegistryError` con un mensaje para mostrar. */
export function useAgentLabActions() {
  const store = agentLabContext.useStore();
  return useMemo(() => {
    const updateAgent = (agentId: string, change: (agent: AgentRecord) => AgentRecord) =>
      store.update((s) => {
        const agent = s.agents[agentId];
        return agent ? saveAgent(s, change(agent)) : s;
      });
    /** Ejecuta la transformación contra el estado actual primero para propagar el error al llamador. */
    const strict = (transform: (s: AgentLabState) => AgentLabState) => {
      const next = transform(store.getSnapshot());
      store.update(() => next);
    };
    return {
      createAgent: (name: string, config?: AgentConfig) => {
        const id = `agent-${Date.now().toString(36)}`;
        strict((s) => saveAgent(s, createAgent(id, name, new Date(), config)));
        return id;
      },
      deleteAgent: (agentId: string) => store.update((s) => deleteAgent(s, agentId)),
      restoreExamples: () => store.update(restoreExamples),
      updateDraft: (agentId: string, draft: AgentConfig) =>
        updateAgent(agentId, (a) => updateDraft(a, draft)),
      renameAgent: (agentId: string, name: string) =>
        updateAgent(agentId, (a) => ({ ...a, name: name.slice(0, 80) })),
      saveVersion: (agentId: string, note: string) =>
        strict((s) => saveAgent(s, saveVersion(s.agents[agentId]!, note, new Date()))),
      publish: (agentId: string, version: number) =>
        strict((s) => publishWithGate(s, agentId, version, new Date())),
      restoreDraftFrom: (agentId: string, version: number) =>
        updateAgent(agentId, (a) => restoreDraftFrom(a, version)),
      saveCustomCase: (evalCase: EvalCase) => strict((s) => saveCustomCase(s, evalCase)),
      deleteCustomCase: (caseId: string) => store.update((s) => deleteCustomCase(s, caseId)),
      setGate: (gate: QualityGate) => store.update((s) => setGate(s, gate)),
      recordEvalRun: (record: EvalRunRecord) => store.update((s) => recordEvalRun(s, record)),
    };
  }, [store]);
}

/** Proveedores de modelo disponibles en el navegador (los inyecta la raíz de composición). */
export interface AgentRuntime {
  readonly local: LlmProvider;
  /** Proveedor real a través del servidor; `null` si no hay credenciales configuradas. */
  readonly remote: LlmProvider | null;
  readonly judge: Judge | null;
  /** Modelo configurado en el servidor para el proveedor real (informativo). */
  readonly remoteModel: string | null;
}

const RuntimeContext = createContext<AgentRuntime | null>(null);

export function AgentRuntimeProvider({ runtime, children }: { runtime: AgentRuntime; children: ReactNode }) {
  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}

export function useAgentRuntime(): AgentRuntime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error("AgentRuntime: falta el Provider correspondiente.");
  return runtime;
}

/** Proveedor principal y de respaldo según la configuración del agente. */
export function resolveProviders(runtime: AgentRuntime, config: AgentConfig) {
  if (config.model.provider === "anthropic" && runtime.remote) {
    return { provider: runtime.remote, fallback: runtime.local };
  }
  return { provider: runtime.local, fallback: undefined };
}
