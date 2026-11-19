import { clientKey, getAuthService, loginLimiter, setSessionCookie } from "@/infrastructure/composition/auth";
import { PERSISTENCE_DISABLED, authErrorResponse } from "@/infrastructure/http/auth-responses";
import { isSameOrigin, jsonError, jsonResponse, readJson } from "@/infrastructure/http/same-origin";
import { loginSchema } from "@/modules/auth/application/auth-schemas";
import { normalizeEmail, toSessionUser } from "@/modules/auth/domain/user";

export async function POST(request: Request) {
  const service = getAuthService();
  if (!service) return jsonError(503, PERSISTENCE_DISABLED);
  if (!isSameOrigin(request)) return jsonError(403, "Origen no permitido.");
  const body = await readJson(request, 10_000);
  if (!body.ok) return body.response;
  const input = loginSchema.safeParse(body.data);
  if (!input.success) return jsonError(400, "Completá email y contraseña.");
  const wait = loginLimiter.take(
    `login:${clientKey(request)}:${normalizeEmail(input.data.email)}`,
    Date.now(),
  );
  if (wait > 0) {
    return jsonError(429, "Demasiados intentos. Probá en unos minutos.", {
      "retry-after": String(Math.ceil(wait / 1000)),
    });
  }
  try {
    const session = await service.login(input.data, request.headers.get("user-agent"));
    await setSessionCookie(session.token, session.expiresAt);
    return jsonResponse({ user: toSessionUser(session.user) });
  } catch (cause) {
    return authErrorResponse(cause);
  }
}
