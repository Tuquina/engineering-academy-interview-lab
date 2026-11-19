import {
  ContentError,
  type Actor,
  type ContentAdminService,
} from "@/modules/content-management/application/content-admin";
import { getCurrentUser } from "../composition/auth";
import { getContentAdmin } from "../composition/content";
import { PERSISTENCE_DISABLED } from "./auth-responses";
import { isSameOrigin, jsonError, jsonResponse } from "./same-origin";

const STATUS: Record<ContentError["code"], number> = {
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  slug_taken: 409,
  invalid: 422,
};

/**
 * Envoltorio común de los endpoints de administración: persistencia disponible, sesión, mismo origen en escrituras
 * y traducción de errores. El permiso de administrador lo verifica el caso de uso (no sólo este adaptador).
 */
export async function withAdmin(
  request: Request,
  handler: (service: ContentAdminService, actor: Actor) => Promise<Response>,
): Promise<Response> {
  const service = getContentAdmin();
  if (!service) return jsonError(503, PERSISTENCE_DISABLED);
  if (request.method !== "GET" && !isSameOrigin(request)) return jsonError(403, "Origen no permitido.");
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Iniciá sesión.");
  try {
    return await handler(service, { id: user.id, role: user.role });
  } catch (cause) {
    if (cause instanceof ContentError) {
      return jsonResponse({ error: cause.message, issues: cause.issues }, STATUS[cause.code]);
    }
    console.error("Error de administración", cause);
    return jsonError(500, "No se pudo completar la operación.");
  }
}
