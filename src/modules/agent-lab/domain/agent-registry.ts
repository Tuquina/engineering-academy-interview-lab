import { DEFAULT_CONFIG, TOOL_NAMES, type AgentConfig } from "./agent-config";

/**
 * Registro de agentes con versionado inmutable (MASTER_PROMPT §16.2 y §25).
 *
 * - El **borrador** se edita libremente.
 * - **Guardar versión** congela una copia numerada del borrador: una versión nunca cambia.
 * - **Publicar** elige qué versión atiende conversaciones. **Rollback** vuelve a publicar una versión anterior.
 * - Cada publicación y rollback queda en el historial, con el resultado del quality gate si se evaluó.
 */

export interface AgentVersion {
  readonly number: number;
  readonly config: AgentConfig;
  readonly note: string;
  readonly createdAt: string;
}

export interface PublishEvent {
  readonly type: "publish" | "rollback";
  readonly version: number;
  readonly at: string;
  readonly note: string;
}

export interface AgentRecord {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly draft: AgentConfig;
  readonly versions: readonly AgentVersion[];
  readonly publishedVersion: number | null;
  readonly history: readonly PublishEvent[];
}

export const MAX_AGENTS = 20;
export const MAX_VERSIONS = 50;

export class AgentRegistryError extends Error {}

export function createAgent(
  id: string,
  name: string,
  now: Date,
  config: AgentConfig = DEFAULT_CONFIG,
): AgentRecord {
  return {
    id,
    name: name.trim() || "Agente sin nombre",
    createdAt: now.toISOString(),
    draft: config,
    versions: [],
    publishedVersion: null,
    history: [],
  };
}

export function updateDraft(agent: AgentRecord, draft: AgentConfig): AgentRecord {
  return { ...agent, draft };
}

export function latestVersion(agent: AgentRecord): AgentVersion | undefined {
  return agent.versions.at(-1);
}

export function findVersion(agent: AgentRecord, number: number): AgentVersion | undefined {
  return agent.versions.find((v) => v.number === number);
}

/** El borrador difiere de la última versión guardada (o todavía no hay versiones). */
export function hasUnsavedChanges(agent: AgentRecord): boolean {
  const latest = latestVersion(agent);
  return !latest || JSON.stringify(latest.config) !== JSON.stringify(agent.draft);
}

export function saveVersion(agent: AgentRecord, note: string, now: Date): AgentRecord {
  if (!hasUnsavedChanges(agent)) {
    throw new AgentRegistryError("El borrador es igual a la última versión: no hay nada nuevo para guardar.");
  }
  if (agent.versions.length >= MAX_VERSIONS) {
    throw new AgentRegistryError(`Se alcanzó el máximo de ${MAX_VERSIONS} versiones para este agente.`);
  }
  const number = (latestVersion(agent)?.number ?? 0) + 1;
  const version: AgentVersion = {
    number,
    config: agent.draft,
    note: note.trim() || `Versión ${number}`,
    createdAt: now.toISOString(),
  };
  return { ...agent, versions: [...agent.versions, version] };
}

/**
 * Publica una versión. Si la versión es anterior a la publicada se registra como rollback.
 * El quality gate lo decide la capa de aplicación antes de llamar a esta función.
 */
export function publishVersion(agent: AgentRecord, number: number, now: Date, note = ""): AgentRecord {
  if (!findVersion(agent, number)) throw new AgentRegistryError(`No existe la versión ${number}.`);
  if (agent.publishedVersion === number) return agent;
  const type = agent.publishedVersion !== null && number < agent.publishedVersion ? "rollback" : "publish";
  const event: PublishEvent = { type, version: number, at: now.toISOString(), note };
  return { ...agent, publishedVersion: number, history: [...agent.history, event] };
}

/** Copia la configuración de una versión al borrador (para partir de ella y modificarla). */
export function restoreDraftFrom(agent: AgentRecord, number: number): AgentRecord {
  const version = findVersion(agent, number);
  if (!version) throw new AgentRegistryError(`No existe la versión ${number}.`);
  return { ...agent, draft: version.config };
}

// ---------------------------------------------------------------------------------------------------------------
// Agentes de ejemplo
// ---------------------------------------------------------------------------------------------------------------

/** v1: primera versión con menos herramientas, más variabilidad y sin presentarse como IA. */
const EXAMPLE_V1: AgentConfig = {
  ...DEFAULT_CONFIG,
  tools: TOOL_NAMES.filter((t) => t !== "get_allowed_offers" && t !== "confirm_payment"),
  rules: DEFAULT_CONFIG.rules.filter((r) => !r.startsWith("Presentate")),
  policies: { ...DEFAULT_CONFIG.policies, discloseAiIdentity: false, escalateOnDispute: false },
  model: { ...DEFAULT_CONFIG.model, variability: 0.5 },
};

/** v2: todas las herramientas, presentación obligatoria, escalamiento ante disputas y menos variabilidad. */
const EXAMPLE_V2: AgentConfig = DEFAULT_CONFIG;

export const EXAMPLE_AGENT_ID = "agent-collections";

export function exampleAgents(): Record<string, AgentRecord> {
  const at = "2026-03-01T12:00:00.000Z";
  const agent: AgentRecord = {
    id: EXAMPLE_AGENT_ID,
    name: "Agente de cobranzas (ejemplo)",
    createdAt: at,
    draft: EXAMPLE_V2,
    versions: [
      { number: 1, config: EXAMPLE_V1, note: "Primera versión", createdAt: at },
      {
        number: 2,
        config: EXAMPLE_V2,
        note: "Agrega ofertas y confirmación de pagos; presentación como IA; escala disputas",
        createdAt: "2026-03-03T12:00:00.000Z",
      },
    ],
    publishedVersion: 1,
    history: [{ type: "publish", version: 1, at, note: "Publicación inicial" }],
  };
  return { [agent.id]: agent };
}
