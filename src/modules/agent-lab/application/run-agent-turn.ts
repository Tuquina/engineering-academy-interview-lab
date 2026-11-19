import { renderSystemPrompt, type AgentConfig } from "../domain/agent-config";
import { findCustomer, formatDate, type CollectionsWorld, type IsoDate } from "../domain/collections-world";
import { userText, type ChatMessage, type ContentBlock, type ToolCallTrace } from "../domain/conversation";
import { extractFacts, factsForPrompt, promiseFact, rememberFact, type MemoryFact } from "../domain/memory";
import { invokeTool, toolResultContent } from "./invoke-tool";
import { ProviderError, type GenerateResponse, type LlmProvider } from "./llm-provider";
import { toolDefinitions } from "./tool-schemas";

/**
 * Caso de uso central del AI Agents Lab: un turno de conversación con loop de herramientas.
 *
 * 1. Arma el contexto: system prompt con variables, memoria de largo plazo vigente y la ventana de mensajes.
 * 2. Llama al modelo con timeout y reintentos; si falla y está configurado, usa el proveedor de respaldo.
 * 3. Si el modelo pide herramientas, valida y ejecuta cada una, y le devuelve los resultados.
 * 4. Repite hasta una respuesta final o hasta el límite de pasos.
 * 5. Actualiza la memoria con hechos extraídos del mensaje y con los compromisos confirmados por herramientas.
 *
 * Todo lo que pasa queda en trazas: pasos, latencias, reintentos, fallbacks y llamadas a herramientas.
 */

export interface RunAgentTurnInput {
  readonly config: AgentConfig;
  readonly provider: LlmProvider;
  readonly fallbackProvider?: LlmProvider;
  readonly history: readonly ChatMessage[];
  readonly userMessage: string;
  readonly world: CollectionsWorld;
  readonly memory: readonly MemoryFact[];
  readonly customerId: string;
  readonly today: IsoDate;
  readonly seed: number;
  readonly clock?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
}

export interface StepTrace {
  readonly index: number;
  readonly providerId: string;
  readonly providerKind: LlmProvider["kind"];
  readonly latencyMs: number;
  readonly attempts: number;
  readonly stopReason: GenerateResponse["stopReason"] | "error";
  readonly toolCalls: readonly string[];
  readonly notes: readonly string[];
}

export interface RunAgentTurnResult {
  readonly reply: string;
  /** Mensajes nuevos de este turno (usuario, asistente y resultados de herramientas), en orden. */
  readonly newMessages: readonly ChatMessage[];
  readonly toolCalls: readonly ToolCallTrace[];
  readonly steps: readonly StepTrace[];
  readonly world: CollectionsWorld;
  readonly memory: readonly MemoryFact[];
  /** Hechos que se enviaron al modelo como memoria de largo plazo. */
  readonly recalled: readonly MemoryFact[];
  /** Cuántos mensajes previos entraron en la ventana de contexto. */
  readonly contextMessages: number;
  readonly latencyMs: number;
  readonly usage: { readonly inputTokens: number; readonly outputTokens: number } | null;
  readonly outcome: "answered" | "max_steps" | "failed" | "refused" | "truncated";
  readonly error: string | null;
}

const MAX_TOKENS = 2_048;
/** Con proveedores reales la historia no se recorta (ver `contextWindow`): se limita su longitud total. */
export const MAX_CONVERSATION_MESSAGES = 60;

export async function runAgentTurn(input: RunAgentTurnInput): Promise<RunAgentTurnResult> {
  const clock = input.clock ?? (() => performance.now());
  const sleep = input.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const started = clock();
  const { config, customerId, today } = input;

  const customer = findCustomer(input.world, customerId);
  const recalled = config.memory.longTerm ? factsForPrompt(input.memory, customerId, today) : [];
  const system = [
    renderSystemPrompt(config, {
      today: formatDate(today),
      customer_name: customer?.name ?? customerId,
      customer_id: customerId,
    }),
    recalled.length
      ? `Memoria de conversaciones anteriores (afirmaciones, verificá con herramientas):\n${recalled
          .map((f) => `- [${f.observedAt}] ${f.text}`)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const userMsg = userText(input.userMessage);
  const window = contextWindow(input.history, config.memory.windowMessages, input.provider.kind);
  const turn: ChatMessage[] = [userMsg];
  const toolCalls: ToolCallTrace[] = [];
  const steps: StepTrace[] = [];
  let world = input.world;
  let memory: MemoryFact[] = [...input.memory];
  let usage: { inputTokens: number; outputTokens: number } | null = null;
  let reply = "";
  let outcome: RunAgentTurnResult["outcome"] = "max_steps";
  let error: string | null = null;
  let providerForTurn = input.provider;

  for (const fact of extractFacts(input.userMessage, customerId, today, factIdGenerator(memory))) {
    memory = rememberFact(memory, fact);
  }

  const tools = toolDefinitions(config.tools);
  for (let index = 0; index < config.model.maxSteps; index++) {
    const request = {
      system,
      messages: [...window, ...turn],
      tools,
      model: config.model.model,
      maxTokens: MAX_TOKENS,
      context: { config, customerId, today, memory: recalled, seed: input.seed },
    };
    const call = await generateWithPolicy(
      providerForTurn,
      input.fallbackProvider,
      request,
      config,
      clock,
      sleep,
    );
    steps.push({
      index,
      providerId: call.provider.id,
      providerKind: call.provider.kind,
      latencyMs: call.latencyMs,
      attempts: call.attempts,
      stopReason: call.response?.stopReason ?? "error",
      toolCalls:
        call.response?.content
          .filter((b) => b.type === "tool_use")
          .map((b) => (b as { name: string }).name) ?? [],
      notes: call.notes,
    });
    if (!call.response) {
      outcome = "failed";
      error = call.notes.at(-1) ?? "El proveedor no respondió.";
      break;
    }
    // Una vez que se usó el respaldo, el resto del turno sigue con él (el historial ya es de ese proveedor).
    providerForTurn = call.provider;
    const response = call.response;
    usage = addUsage(usage, response.usage);
    turn.push({ role: "assistant", content: response.content, providerContent: response.providerContent });

    if (response.stopReason === "refusal") {
      outcome = "refused";
      reply = textBlocks(response.content) || "El modelo se negó a responder.";
      break;
    }
    const toolUses = response.content.filter(
      (b): b is Extract<ContentBlock, { type: "tool_use" }> => b.type === "tool_use",
    );
    if (response.stopReason === "max_tokens" && toolUses.length) {
      // Un tool_use cortado puede parecer válido: no se ejecuta.
      outcome = "truncated";
      error = "La respuesta se cortó por límite de tokens en medio de una llamada a herramienta.";
      break;
    }
    if (toolUses.length === 0) {
      reply = textBlocks(response.content);
      outcome = "answered";
      break;
    }

    const results: ContentBlock[] = [];
    for (const use of toolUses) {
      const invoked = invokeTool({
        id: use.id,
        name: use.name,
        input: use.input,
        world,
        allowedTools: config.tools,
        today,
        policies: config.policies,
        sessionCustomerId: customerId,
        clock,
      });
      world = invoked.world;
      toolCalls.push(invoked.trace);
      results.push({
        type: "tool_result",
        toolUseId: use.id,
        content: toolResultContent(invoked.trace),
        isError: invoked.trace.status !== "ok",
      });
      if (invoked.trace.status === "ok" && use.name === "register_payment_promise" && invoked.trace.result) {
        const r = invoked.trace.result as { amount: string; date: string };
        memory = rememberFact(
          memory,
          promiseFact(factIdGenerator(memory)(), customerId, today, r.date, r.amount),
        );
      }
    }
    turn.push({ role: "user", content: results });
  }

  if (outcome === "max_steps") {
    error = `Se alcanzó el máximo de ${config.model.maxSteps} pasos sin una respuesta final.`;
  }

  return {
    reply,
    newMessages: turn,
    toolCalls,
    steps,
    world,
    memory,
    recalled,
    contextMessages: window.length,
    latencyMs: Math.max(0, clock() - started),
    usage,
    outcome,
    error,
  };
}

/**
 * Ventana de memoria de corto plazo: los últimos `size` mensajes, empezando siempre en un mensaje de texto del
 * usuario para no cortar un par `tool_use`/`tool_result`.
 *
 * Con un proveedor real no se recorta: algunos modelos devuelven razonamiento firmado que debe reenviarse sin
 * cambios, y quitar el principio de la historia equivale a editarla. En ese caso se limita la longitud total.
 */
export function contextWindow(
  history: readonly ChatMessage[],
  size: number,
  kind: LlmProvider["kind"],
): ChatMessage[] {
  if (kind === "remote") return history.slice(-MAX_CONVERSATION_MESSAGES);
  if (history.length <= size) return [...history];
  for (let start = history.length - size; start < history.length; start++) {
    const message = history[start]!;
    if (message.role === "user" && message.content.some((b) => b.type === "text"))
      return history.slice(start);
  }
  return [];
}

interface PolicyCall {
  readonly provider: LlmProvider;
  readonly response: GenerateResponse | null;
  readonly attempts: number;
  readonly latencyMs: number;
  readonly notes: string[];
}

/** Timeout por intento, reintentos con backoff para errores transitorios y fallback opcional al proveedor local. */
async function generateWithPolicy(
  provider: LlmProvider,
  fallback: LlmProvider | undefined,
  request: Parameters<LlmProvider["generate"]>[0],
  config: AgentConfig,
  clock: () => number,
  sleep: (ms: number) => Promise<void>,
): Promise<PolicyCall> {
  const notes: string[] = [];
  const started = clock();
  const maxAttempts = 1 + Math.max(0, config.model.retries);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await withTimeout(provider, request, config.model.timeoutMs);
      return { provider, response, attempts: attempt, latencyMs: clock() - started, notes };
    } catch (cause) {
      const err = cause instanceof ProviderError ? cause : new ProviderError(String(cause), false);
      notes.push(`Intento ${attempt} con ${provider.id} falló: ${err.message}`);
      if (!err.retryable || attempt === maxAttempts) break;
      await sleep(250 * 2 ** (attempt - 1));
    }
  }
  if (fallback && config.model.fallbackToLocal && fallback !== provider) {
    notes.push(`Se usa el proveedor de respaldo (${fallback.id}).`);
    try {
      const response = await withTimeout(fallback, request, config.model.timeoutMs);
      return { provider: fallback, response, attempts: maxAttempts + 1, latencyMs: clock() - started, notes };
    } catch (cause) {
      notes.push(`El respaldo también falló: ${String(cause)}`);
    }
  }
  return { provider, response: null, attempts: maxAttempts, latencyMs: clock() - started, notes };
}

async function withTimeout(
  provider: LlmProvider,
  request: Parameters<LlmProvider["generate"]>[0],
  timeoutMs: number,
): Promise<GenerateResponse> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ProviderError(`Timeout de ${timeoutMs} ms`, true));
    }, timeoutMs);
  });
  try {
    return await Promise.race([provider.generate(request, controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

type Usage = { inputTokens: number; outputTokens: number };

function addUsage(total: Usage | null, step: GenerateResponse["usage"]): Usage | null {
  if (!step) return total;
  return {
    inputTokens: (total?.inputTokens ?? 0) + step.inputTokens,
    outputTokens: (total?.outputTokens ?? 0) + step.outputTokens,
  };
}

function textBlocks(content: readonly ContentBlock[]): string {
  return content
    .filter((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function factIdGenerator(memory: readonly MemoryFact[]): () => string {
  let next = memory.length + 1;
  const used = new Set(memory.map((f) => f.id));
  return () => {
    while (used.has(`F-${next}`)) next++;
    const id = `F-${next}`;
    used.add(id);
    return id;
  };
}
