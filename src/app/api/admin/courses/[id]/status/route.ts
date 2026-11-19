import { withAdmin } from "@/infrastructure/http/admin-handler";
import { jsonError, jsonResponse, readJson } from "@/infrastructure/http/same-origin";
import { statusSchema } from "@/modules/content-management/application/content-schemas";

/** Publicar o despublicar un curso (valida integridad antes de publicar). */
export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withAdmin(request, async (service, actor) => {
    const { id } = await context.params;
    const body = await readJson(request, 2_000);
    if (!body.ok) return body.response;
    const input = statusSchema.safeParse(body.data);
    if (!input.success) return jsonError(400, "Solicitud inválida.");
    return jsonResponse({
      course: await service.setStatus(actor, id, input.data.expectedVersion, input.data.status),
    });
  });
}
