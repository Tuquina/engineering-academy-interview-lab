import { z } from "zod";
import { withAdmin } from "@/infrastructure/http/admin-handler";
import { jsonError, jsonResponse, readJson } from "@/infrastructure/http/same-origin";

interface Context {
  params: Promise<{ id: string }>;
}

export function GET(request: Request, context: Context) {
  return withAdmin(request, async (service, actor) => {
    const { id } = await context.params;
    return jsonResponse({ versions: await service.versions(actor, id) });
  });
}

const restoreSchema = z.object({
  version: z.number().int().min(1),
  expectedVersion: z.number().int().min(1),
});

/** Restaura una versión anterior creando una versión nueva con su contenido. */
export function POST(request: Request, context: Context) {
  return withAdmin(request, async (service, actor) => {
    const { id } = await context.params;
    const body = await readJson(request, 2_000);
    if (!body.ok) return body.response;
    const input = restoreSchema.safeParse(body.data);
    if (!input.success) return jsonError(400, "Solicitud inválida.");
    return jsonResponse(await service.restore(actor, id, input.data.version, input.data.expectedVersion));
  });
}
