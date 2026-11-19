import { getJudge } from "@/infrastructure/composition/ai-server";
import { guardAiRequest, jsonError } from "@/infrastructure/ai/request-guard";
import { ProviderError } from "@/modules/agent-lab/application/llm-provider";
import { judgeWireSchema } from "@/modules/agent-lab/application/wire-schemas";

/** LLM as Judge: evalúa una conversación contra una rúbrica con salida estructurada. */
export async function POST(request: Request) {
  const guarded = await guardAiRequest(request, judgeWireSchema);
  if (!guarded.ok) return guarded.response;
  try {
    const verdict = await getJudge().judge(guarded.data);
    return Response.json(verdict, { headers: { "cache-control": "no-store" } });
  } catch (cause) {
    const error = cause instanceof ProviderError ? cause : new ProviderError(String(cause), false);
    return jsonError(error.retryable ? 502 : 422, error.message);
  }
}
