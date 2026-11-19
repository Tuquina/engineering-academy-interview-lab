import { HttpJudge, HttpLlmProvider } from "@/modules/agent-lab/infrastructure/http-llm-provider";
import { LocalDeterministicProvider } from "@/modules/agent-lab/infrastructure/local-deterministic-provider";
import type { AgentRuntime } from "@/modules/agent-lab/presentation/agent-lab-context";

/**
 * Raíz de composición de los proveedores de modelo en el navegador.
 *
 * El proveedor local siempre existe. El real sólo si el servidor informa que tiene credenciales; aun así, las
 * llamadas pasan por Route Handlers y la API key nunca llega al navegador.
 */
export function createAgentRuntime(ai: {
  readonly enabled: boolean;
  readonly model: string | null;
}): AgentRuntime {
  return {
    local: new LocalDeterministicProvider(),
    remote: ai.enabled ? new HttpLlmProvider(`anthropic:${ai.model ?? "?"}`) : null,
    judge: ai.enabled ? new HttpJudge(`anthropic-judge:${ai.model ?? "?"}`) : null,
    remoteModel: ai.enabled ? ai.model : null,
  };
}
