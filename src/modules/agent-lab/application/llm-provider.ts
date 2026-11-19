import type { AgentConfig } from "../domain/agent-config";
import type { ChatMessage, ContentBlock } from "../domain/conversation";
import type { MemoryFact } from "../domain/memory";
import type { ToolDefinition } from "./tool-schemas";

/**
 * Puerto hacia un modelo de lenguaje (MASTER_PROMPT §16.3: interfaz de proveedor desacoplada).
 *
 * Un paso = una llamada al modelo. El loop de herramientas vive en la aplicación (`runAgentTurn`), no en el
 * proveedor: así el mismo loop, con sus validaciones, límites y trazas, funciona con el proveedor local o con uno
 * real.
 */
export interface LlmProvider {
  readonly id: string;
  /** `simulated`: proveedor local determinista. `remote`: un modelo real detrás de una API. */
  readonly kind: "simulated" | "remote";
  generate(request: GenerateRequest, signal?: AbortSignal): Promise<GenerateResponse>;
}

export interface GenerateRequest {
  readonly system: string;
  readonly messages: readonly ChatMessage[];
  readonly tools: readonly ToolDefinition[];
  readonly model: string;
  readonly maxTokens: number;
  /**
   * Contexto estructurado. Un proveedor real ya lo recibe como texto dentro de `system`; el proveedor local lo usa
   * directamente porque no interpreta lenguaje natural.
   */
  readonly context?: {
    readonly config: AgentConfig;
    readonly customerId: string;
    readonly today: string;
    readonly memory: readonly MemoryFact[];
    readonly seed: number;
  };
}

export interface GenerateResponse {
  readonly content: readonly ContentBlock[];
  readonly stopReason: "end_turn" | "tool_use" | "max_tokens" | "refusal" | "other";
  /** Tokens informados por un proveedor real; `null` en el proveedor local (no hay tokens reales). */
  readonly usage: { readonly inputTokens: number; readonly outputTokens: number } | null;
  /** Contenido crudo del proveedor para reenviarlo sin cambios en el siguiente paso. */
  readonly providerContent?: unknown;
}

/** Error de un proveedor; `retryable` indica fallas transitorias (timeout, 429, 5xx). */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}
