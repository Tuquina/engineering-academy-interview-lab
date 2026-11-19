import {
  ProviderError,
  type GenerateRequest,
  type GenerateResponse,
  type LlmProvider,
} from "../application/llm-provider";
import type { Judge } from "../application/run-evals";
import type { GenerateWire } from "../application/wire-schemas";

/**
 * Adaptadores de navegador hacia el proveedor real. El navegador nunca ve la API key: llama a Route Handlers de la
 * propia aplicación, que son los únicos que la leen (MASTER_PROMPT §16.3 y §30).
 */
export class HttpLlmProvider implements LlmProvider {
  readonly kind = "remote" as const;

  constructor(
    readonly id: string,
    private readonly endpoint = "/api/agent-lab/generate",
  ) {}

  async generate(request: GenerateRequest, signal?: AbortSignal): Promise<GenerateResponse> {
    const wire: GenerateWire = {
      system: request.system,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: [...m.content],
        ...(Array.isArray(m.providerContent)
          ? { providerContent: m.providerContent as Record<string, unknown>[] }
          : {}),
      })),
      toolNames: request.tools.map((t) => t.name),
      model: request.model,
      maxTokens: request.maxTokens,
    };
    const response = await post(this.endpoint, wire, signal);
    return (await response.json()) as GenerateResponse;
  }
}

export class HttpJudge implements Judge {
  constructor(
    readonly id: string,
    private readonly endpoint = "/api/agent-lab/judge",
  ) {}

  async judge(input: {
    rubric: string;
    transcript: string;
  }): Promise<{ passed: boolean; reasoning: string }> {
    const response = await post(this.endpoint, input);
    return (await response.json()) as { passed: boolean; reasoning: string };
  }
}

async function post(endpoint: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    throw new ProviderError(`Sin conexión con el servidor: ${String(cause)}`, true);
  }
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null;
    const retryable = response.status === 429 || response.status >= 500;
    throw new ProviderError(detail?.error ?? `HTTP ${response.status}`, retryable && response.status !== 503);
  }
  return response;
}
