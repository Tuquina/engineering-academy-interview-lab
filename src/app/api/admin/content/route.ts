import { randomUUID } from "node:crypto";
import { withAdmin } from "@/infrastructure/http/admin-handler";
import { jsonError, jsonResponse, readJson } from "@/infrastructure/http/same-origin";
import { importSchema } from "@/modules/content-management/application/content-schemas";

/** Exporta todo el contenido personalizado en el formato `eal-content` v1. */
export function GET(request: Request) {
  return withAdmin(request, async (service, actor) => {
    const file = await service.exportAll(actor);
    return jsonResponse(file, 200, {
      "content-disposition": `attachment; filename="interview-lab-contenido-${file.exportedAt.slice(0, 10)}.json"`,
    });
  });
}

/** Importa un archivo `eal-content` validado (idempotente por slug). */
export function POST(request: Request) {
  return withAdmin(request, async (service, actor) => {
    const body = await readJson(request, 5_000_000);
    if (!body.ok) return body.response;
    const input = importSchema.safeParse(body.data);
    if (!input.success) {
      const issue = input.error.issues[0];
      return jsonError(
        400,
        `El archivo no es válido (${issue?.path.join(".") ?? ""}: ${issue?.message ?? ""}).`,
      );
    }
    return jsonResponse(await service.import(actor, input.data.file, input.data.mode, randomUUID));
  });
}
