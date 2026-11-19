import { getCurrentUser } from "@/infrastructure/composition/auth";
import { getUserDocumentService } from "@/infrastructure/composition/sync";
import { PERSISTENCE_DISABLED } from "@/infrastructure/http/auth-responses";
import { jsonError, jsonResponse } from "@/infrastructure/http/same-origin";

/** Documentos sincronizados del usuario de la sesión (sólo los propios: el id sale de la sesión, nunca del cliente). */
export async function GET() {
  const service = getUserDocumentService();
  if (!service) return jsonError(503, PERSISTENCE_DISABLED);
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Iniciá sesión para sincronizar.");
  return jsonResponse({ documents: await service.getAll(user.id) });
}
