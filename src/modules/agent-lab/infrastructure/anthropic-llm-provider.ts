import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { describeAnthropicError } from "@/infrastructure/ai/anthropic-errors";
import {
  ProviderError,
  type GenerateRequest,
  type GenerateResponse,
  type LlmProvider,
} from "../application/llm-provider";
import type { Judge } from "../application/run-evals";
import { isRemoteModel, type RemoteModelId } from "../domain/agent-config";
import type { ChatMessage, ContentBlock } from "../domain/conversation";

/**
 * Adaptador de servidor hacia la API de Anthropic. Sólo se instancia en Route Handlers: la API key nunca sale del
 * servidor (MASTER_PROMPT §16.3).
 *
 * - Los reintentos los decide el caso de uso (`runAgentTurn`), por eso el cliente se crea con `maxRetries: 0`.
 * - Las herramientas se declaran con `strict: true`: el modelo sólo puede generar argumentos que cumplan el esquema
 *   (igual se validan antes de ejecutar).
 * - El contenido del asistente se reenvía tal cual llegó (`providerContent`): incluye bloques de razonamiento
 *   firmados que la API exige recibir sin cambios en los pasos siguientes.
 */
export class AnthropicLlmProvider implements LlmProvider {
  readonly kind = "remote" as const;
  readonly id: string;

  constructor(
    private readonly client: Anthropic,
    private readonly defaultModel: RemoteModelId,
    private readonly maxOutputTokens = 2_048,
  ) {
    this.id = `anthropic:${defaultModel}`;
  }

  async generate(request: GenerateRequest, signal?: AbortSignal): Promise<GenerateResponse> {
    const model = isRemoteModel(request.model) ? request.model : this.defaultModel;
    try {
      const response = await this.client.messages.create(
        {
          model,
          max_tokens: Math.min(request.maxTokens, this.maxOutputTokens),
          // Caché automática del prefijo estable (system + herramientas): baja costo y latencia entre pasos.
          cache_control: { type: "ephemeral" },
          system: request.system,
          tools: request.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
            strict: true,
          })),
          messages: request.messages.map(toAnthropicMessage),
        },
        { signal },
      );
      return {
        content: response.content.flatMap(fromAnthropicBlock),
        stopReason: mapStopReason(response.stop_reason),
        usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
        providerContent: response.content,
      };
    } catch (cause) {
      throw toProviderError(cause);
    }
  }
}

const verdictSchema = z.object({
  passed: z.boolean().describe("true si la respuesta cumple la rúbrica"),
  reasoning: z.string().describe("Justificación breve, citando la parte de la conversación que la sustenta"),
});

/**
 * LLM as Judge con salida estructurada: el veredicto se valida contra un esquema, no se interpreta texto libre.
 * Conviene un modelo distinto (o al menos un prompt distinto) del agente evaluado para reducir sesgos.
 */
export class AnthropicJudge implements Judge {
  readonly id: string;

  constructor(
    private readonly client: Anthropic,
    private readonly model: RemoteModelId,
  ) {
    this.id = `anthropic-judge:${model}`;
  }

  async judge(input: {
    rubric: string;
    transcript: string;
  }): Promise<{ passed: boolean; reasoning: string }> {
    try {
      const response = await this.client.messages.parse({
        model: this.model,
        max_tokens: 1_024,
        system:
          "Sos un evaluador estricto de conversaciones de cobranza. Evaluás sólo con la rúbrica dada, sin suponer " +
          "información que no esté en la conversación. Si hay dudas razonables, el caso no cumple.",
        messages: [
          {
            role: "user",
            content: `Rúbrica:\n${input.rubric}\n\nConversación:\n<conversacion>\n${input.transcript}\n</conversacion>`,
          },
        ],
        output_config: { format: zodOutputFormat(verdictSchema) },
      });
      if (!response.parsed_output) throw new ProviderError("El juez no devolvió un veredicto válido.", false);
      return response.parsed_output;
    } catch (cause) {
      throw toProviderError(cause);
    }
  }
}

function toAnthropicMessage(message: ChatMessage): Anthropic.MessageParam {
  if (message.role === "assistant" && Array.isArray(message.providerContent)) {
    return { role: "assistant", content: message.providerContent as Anthropic.ContentBlockParam[] };
  }
  return {
    role: message.role,
    content: message.content.map((block): Anthropic.ContentBlockParam => {
      switch (block.type) {
        case "text":
          return { type: "text", text: block.text };
        case "tool_use":
          return { type: "tool_use", id: block.id, name: block.name, input: block.input };
        case "tool_result":
          return {
            type: "tool_result",
            tool_use_id: block.toolUseId,
            content: block.content,
            is_error: block.isError,
          };
      }
    }),
  };
}

function fromAnthropicBlock(block: Anthropic.ContentBlock): ContentBlock[] {
  if (block.type === "text") return [{ type: "text", text: block.text }];
  if (block.type === "tool_use")
    return [{ type: "tool_use", id: block.id, name: block.name, input: block.input }];
  // Razonamiento y otros bloques internos no se muestran: viajan en providerContent.
  return [];
}

function mapStopReason(reason: Anthropic.StopReason | null): GenerateResponse["stopReason"] {
  switch (reason) {
    case "end_turn":
    case "stop_sequence":
      return "end_turn";
    case "tool_use":
      return "tool_use";
    case "max_tokens":
    case "model_context_window_exceeded":
      return "max_tokens";
    case "refusal":
      return "refusal";
    default:
      return "other";
  }
}

/** Traduce errores del SDK a errores del puerto, marcando cuáles conviene reintentar. */
export function toProviderError(cause: unknown): ProviderError {
  if (cause instanceof ProviderError) return cause;
  const { message, retryable } = describeAnthropicError(cause);
  return new ProviderError(message, retryable);
}
