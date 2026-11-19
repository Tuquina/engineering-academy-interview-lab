import { withAdmin } from "@/infrastructure/http/admin-handler";
import { jsonError, jsonResponse, readJson } from "@/infrastructure/http/same-origin";
import { createCourseSchema } from "@/modules/content-management/application/content-schemas";

export function GET(request: Request) {
  return withAdmin(request, async (service, actor) => jsonResponse({ courses: await service.list(actor) }));
}

export function POST(request: Request) {
  return withAdmin(request, async (service, actor) => {
    const body = await readJson(request, 10_000);
    if (!body.ok) return body.response;
    const input = createCourseSchema.safeParse(body.data);
    if (!input.success) return jsonError(400, "Completá el título y el área.");
    return jsonResponse({ course: await service.create(actor, input.data) }, 201);
  });
}
