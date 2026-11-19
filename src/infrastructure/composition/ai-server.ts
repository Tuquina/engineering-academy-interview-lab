import Anthropic from "@anthropic-ai/sdk";
import {
  AnthropicJudge,
  AnthropicLlmProvider,
} from "@/modules/agent-lab/infrastructure/anthropic-llm-provider";
import { isRemoteModel } from "@/modules/agent-lab/domain/agent-config";
import { AnthropicMentorModel } from "@/modules/mentor/infrastructure/anthropic-mentor-model";
import { defaultModel } from "./ai";

/**
 * Raíz de composición de los adaptadores LLM del servidor. El cliente del SDK lee `ANTHROPIC_API_KEY` del entorno;
 * este módulo sólo se importa desde Route Handlers, nunca desde el navegador.
 */
let client: Anthropic | null = null;

function getClient(): Anthropic {
  // Los reintentos los maneja la aplicación (política del agente); el SDK no reintenta por su cuenta.
  client ??= new Anthropic({ maxRetries: 0, timeout: 60_000 });
  return client;
}

export function getAgentProvider() {
  return new AnthropicLlmProvider(getClient(), defaultModel());
}

export function getJudge() {
  const configured = process.env.AI_JUDGE_MODEL?.trim() ?? "";
  return new AnthropicJudge(getClient(), isRemoteModel(configured) ? configured : defaultModel());
}

export function getMentorModel() {
  return new AnthropicMentorModel(getClient(), defaultModel());
}
