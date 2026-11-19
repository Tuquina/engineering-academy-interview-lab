import {
  AgentRegistryError,
  MAX_AGENTS,
  exampleAgents,
  findVersion,
  publishVersion,
  type AgentRecord,
} from "./agent-registry";
import {
  DEFAULT_GATE,
  evaluateGate,
  type EvalCase,
  type GateResult,
  type QualityGate,
  type SuiteSummary,
} from "./evaluation";

/** Estado persistido del AI Agents Lab (modo invitado: localStorage, ADR-0004). */

export const AGENT_LAB_SCHEMA_VERSION = 1;
export const MAX_EVAL_HISTORY = 40;
export const MAX_CUSTOM_CASES = 30;

/** Resumen de una corrida de la suite (sin transcripciones, para no llenar el almacenamiento). */
export interface EvalRunRecord {
  readonly id: string;
  readonly agentId: string;
  /** Versión evaluada; `null` = borrador sin guardar. */
  readonly version: number | null;
  readonly providerId: string;
  readonly model: string | null;
  readonly at: string;
  readonly repetitions: number;
  readonly caseIds: readonly string[];
  readonly summary: SuiteSummary;
}

export interface AgentLabState {
  readonly schemaVersion: typeof AGENT_LAB_SCHEMA_VERSION;
  readonly agents: Readonly<Record<string, AgentRecord>>;
  readonly customCases: readonly EvalCase[];
  readonly gate: QualityGate;
  readonly evalHistory: readonly EvalRunRecord[];
}

export const EMPTY_AGENT_LAB: AgentLabState = {
  schemaVersion: AGENT_LAB_SCHEMA_VERSION,
  agents: exampleAgents(),
  customCases: [],
  gate: DEFAULT_GATE,
  evalHistory: [],
};

export function saveAgent(state: AgentLabState, agent: AgentRecord): AgentLabState {
  if (!(agent.id in state.agents) && Object.keys(state.agents).length >= MAX_AGENTS) {
    throw new AgentRegistryError(`Se alcanzó el máximo de ${MAX_AGENTS} agentes.`);
  }
  return { ...state, agents: { ...state.agents, [agent.id]: agent } };
}

export function deleteAgent(state: AgentLabState, agentId: string): AgentLabState {
  if (!(agentId in state.agents)) return state;
  const { [agentId]: _removed, ...agents } = state.agents;
  return { ...state, agents, evalHistory: state.evalHistory.filter((r) => r.agentId !== agentId) };
}

export function restoreExamples(state: AgentLabState): AgentLabState {
  return { ...state, agents: { ...state.agents, ...exampleAgents() } };
}

export function saveCustomCase(state: AgentLabState, evalCase: EvalCase): AgentLabState {
  const exists = state.customCases.some((c) => c.id === evalCase.id);
  if (!exists && state.customCases.length >= MAX_CUSTOM_CASES) {
    throw new AgentRegistryError(`Se alcanzó el máximo de ${MAX_CUSTOM_CASES} casos propios.`);
  }
  const customCases = exists
    ? state.customCases.map((c) => (c.id === evalCase.id ? evalCase : c))
    : [...state.customCases, evalCase];
  return { ...state, customCases };
}

export function deleteCustomCase(state: AgentLabState, caseId: string): AgentLabState {
  return { ...state, customCases: state.customCases.filter((c) => c.id !== caseId) };
}

export function setGate(state: AgentLabState, gate: QualityGate): AgentLabState {
  return { ...state, gate };
}

export function recordEvalRun(state: AgentLabState, record: EvalRunRecord): AgentLabState {
  return { ...state, evalHistory: [...state.evalHistory, record].slice(-MAX_EVAL_HISTORY) };
}

/** Última corrida de la suite sobre una versión concreta de un agente. */
export function latestEvalFor(
  state: AgentLabState,
  agentId: string,
  version: number,
): EvalRunRecord | undefined {
  return state.evalHistory.filter((r) => r.agentId === agentId && r.version === version).at(-1);
}

export type PublishCheck =
  | { readonly allowed: true; readonly gate: GateResult | null; readonly record: EvalRunRecord | null }
  | { readonly allowed: false; readonly reasons: readonly string[] };

/**
 * Quality gate de publicación (MASTER_PROMPT §16.7): una versión sólo se publica si su última evaluación cumple
 * los criterios vigentes. El gate se recalcula con los criterios actuales sobre el resumen guardado.
 *
 * Un **rollback** a una versión anterior no pasa por el gate: es el camino de emergencia y debe estar siempre
 * disponible.
 */
export function checkPublish(state: AgentLabState, agentId: string, version: number): PublishCheck {
  const agent = state.agents[agentId];
  if (!agent || !findVersion(agent, version)) return { allowed: false, reasons: ["La versión no existe."] };
  const isRollback = agent.publishedVersion !== null && version < agent.publishedVersion;
  if (!state.gate.enabled || isRollback) return { allowed: true, gate: null, record: null };
  const record = latestEvalFor(state, agentId, version);
  if (!record) {
    return {
      allowed: false,
      reasons: [`Ejecutá la suite de evaluación sobre la versión ${version} antes de publicarla.`],
    };
  }
  const gate = evaluateGate(record.summary, record.repetitions, state.gate);
  return gate.passed ? { allowed: true, gate, record } : { allowed: false, reasons: gate.reasons };
}

export function publishWithGate(
  state: AgentLabState,
  agentId: string,
  version: number,
  now: Date,
): AgentLabState {
  const check = checkPublish(state, agentId, version);
  if (!check.allowed) throw new AgentRegistryError(check.reasons.join(" "));
  const agent = state.agents[agentId]!;
  const note = check.gate
    ? `Quality gate aprobado (${Math.round(check.record!.summary.passRate * 100)} % en ${check.record!.summary.runs} ejecuciones).`
    : state.gate.enabled
      ? "Rollback: no requiere quality gate."
      : "Publicado con el quality gate desactivado.";
  return saveAgent(state, publishVersion(agent, version, now, note));
}
