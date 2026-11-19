import {
  clientKey,
  getAuthService,
  setSessionCookie,
  takeAuthAttempt,
} from "@/infrastructure/composition/auth";
import { PERSISTENCE_DISABLED, authErrorResponse } from "@/infrastructure/http/auth-responses";
import { isSameOrigin, jsonError, jsonResponse, readJson } from "@/infrastructure/http/same-origin";
import { registerSchema } from "@/modules/auth/application/auth-schemas";
import { toSessionUser } from "@/modules/auth/domain/user";

export async function POST(request: Request) {
  const service = getAuthService();
  if (!service) return jsonError(503, PERSISTENCE_DISABLED);
  if (!isSameOrigin(request)) return jsonError(403, "Origen no permitido.");
  if ((await takeAuthAttempt(`register:${clientKey(request)}`)) > 0) {
    return jsonError(429, "Demasiados intentos. Probá en unos minutos.");
  }
  const body = await readJson(request, 10_000);
  if (!body.ok) return body.response;
  const input = registerSchema.safeParse(body.data);
  if (!input.success) return jsonError(400, "Completá email y contraseña.");
  try {
    const session = await service.register(input.data, request.headers.get("user-agent"));
    await setSessionCookie(session.token, session.expiresAt);
    return jsonResponse({ user: toSessionUser(session.user) }, 201);
  } catch (cause) {
    return authErrorResponse(cause);
  }
}
