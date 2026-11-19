import { z } from "zod";
import { getCurrentUser } from "@/infrastructure/composition/auth";
import { getUserDocumentService } from "@/infrastructure/composition/sync";
import { PERSISTENCE_DISABLED } from "@/infrastructure/http/auth-responses";
import { isSameOrigin, jsonError, jsonResponse, readJson } from "@/infrastructure/http/same-origin";
import { MAX_DOCUMENT_BYTES, SyncError, isSyncStoreKey } from "@/modules/sync/application/user-documents";

const bodySchema = z.object({ baseRevision: z.number().int().min(0), data: z.unknown() });

/**
 * Escritura condicional de un documento: 200 con la nueva revisión, o 409 con el documento actual si otro
 * dispositivo escribió antes (el cliente combina y reintenta).
 */
export async function PUT(request: Request, context: { params: Promise<{ store: string }> }) {
  const service = getUserDocumentService();
  if (!service) return jsonError(503, PERSISTENCE_DISABLED);
  if (!isSameOrigin(request)) return jsonError(403, "Origen no permitido.");
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Iniciá sesión para sincronizar.");
  const { store } = await context.params;
  if (!isSyncStoreKey(store)) return jsonError(404, "Store desconocido.");
  const body = await readJson(request, MAX_DOCUMENT_BYTES + 1_000);
  if (!body.ok) return body.response;
  const input = bodySchema.safeParse(body.data);
  if (!input.success) return jsonError(400, "Solicitud inválida.");
  try {
    const result = await service.put(user.id, store, input.data.baseRevision, input.data.data);
    return result.ok
      ? jsonResponse({ revision: result.revision })
      : jsonResponse({ current: result.current }, 409);
  } catch (cause) {
    if (cause instanceof SyncError) return jsonError(cause.code === "too_large" ? 413 : 422, cause.message);
    console.error("Error de sincronización", cause);
    return jsonError(500, "No se pudo guardar.");
  }
}
