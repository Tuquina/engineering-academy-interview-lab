import { getAgentProvider } from "@/infrastructure/composition/ai-server";
import { guardAiRequest, jsonError } from "@/infrastructure/ai/request-guard";
import { ProviderError } from "@/modules/agent-lab/application/llm-provider";
import { toolDefinitions } from "@/modules/agent-lab/application/tool-schemas";
import { generateWireSchema } from "@/modules/agent-lab/application/wire-schemas";
import type { ChatMessage } from "@/modules/agent-lab/domain/conversation";

/**
 * Un paso del modelo real para el AI Agents Lab. Es delgado: valida, arma las definiciones de herramientas del lado
 * del servidor y delega en el adaptador. El loop de herramientas y su ejecución ocurren en el navegador, sobre datos
 * ficticios; el servidor nunca ejecuta herramientas ni código del usuario.
 */
export async function POST(request: Request) {
  const guarded = await guardAiRequest(request, generateWireSchema);
  if (!guarded.ok) return guarded.response;
  const wire = guarded.data;
  try {
    const response = await getAgentProvider().generate(
      {
        system: wire.system,
        messages: wire.messages as ChatMessage[],
        tools: toolDefinitions(wire.toolNames),
        model: wire.model,
        maxTokens: wire.maxTokens,
      },
      request.signal,
    );
    return Response.json(response, { headers: { "cache-control": "no-store" } });
  } catch (cause) {
    const error = cause instanceof ProviderError ? cause : new ProviderError(String(cause), false);
    return jsonError(error.retryable ? 502 : 422, error.message);
  }
}
