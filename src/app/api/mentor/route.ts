import { getMentorModel } from "@/infrastructure/composition/ai-server";
import { guardAiRequest, jsonError } from "@/infrastructure/ai/request-guard";
import { describeAnthropicError } from "@/infrastructure/ai/anthropic-errors";
import { askMentor, mentorRequestSchema } from "@/modules/mentor/application/ask-mentor";

/** AI Study Mentor: una respuesta del tutor con el contexto que la persona autorizó compartir. */
export async function POST(request: Request) {
  const guarded = await guardAiRequest(request, mentorRequestSchema);
  if (!guarded.ok) return guarded.response;
  try {
    const answer = await askMentor(guarded.data, getMentorModel());
    return Response.json(answer, { headers: { "cache-control": "no-store" } });
  } catch (cause) {
    const error = describeAnthropicError(cause);
    return jsonError(error.retryable ? 502 : 422, error.message);
  }
}
