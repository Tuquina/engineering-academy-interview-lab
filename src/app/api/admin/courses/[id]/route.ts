import { withAdmin } from "@/infrastructure/http/admin-handler";
import { jsonError, jsonResponse, readJson } from "@/infrastructure/http/same-origin";
import { saveCourseSchema } from "@/modules/content-management/application/content-schemas";

interface Context {
  params: Promise<{ id: string }>;
}

const UUID = /^[0-9a-f-]{36}$/i;

export function GET(request: Request, context: Context) {
  return withAdmin(request, async (service, actor) => {
    const { id } = await context.params;
    if (!UUID.test(id)) return jsonError(404, "El curso no existe.");
    return jsonResponse(await service.get(actor, id));
  });
}

export function PUT(request: Request, context: Context) {
  return withAdmin(request, async (service, actor) => {
    const { id } = await context.params;
    if (!UUID.test(id)) return jsonError(404, "El curso no existe.");
    const body = await readJson(request, 2_000_000);
    if (!body.ok) return body.response;
    const input = saveCourseSchema.safeParse(body.data);
    if (!input.success) {
      const issue = input.error.issues[0];
      return jsonError(
        400,
        `Datos inválidos en ${issue?.path.join(".") ?? "el curso"}: ${issue?.message ?? ""}`,
      );
    }
    return jsonResponse(
      await service.save(actor, id, input.data.expectedVersion, input.data.course, input.data.note),
    );
  });
}

export function DELETE(request: Request, context: Context) {
  return withAdmin(request, async (service, actor) => {
    const { id } = await context.params;
    if (!UUID.test(id)) return jsonError(404, "El curso no existe.");
    await service.delete(actor, id);
    return jsonResponse({ ok: true });
  });
}
