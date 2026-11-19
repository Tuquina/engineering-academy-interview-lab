import { withAdmin } from "@/infrastructure/http/admin-handler";
import { jsonResponse } from "@/infrastructure/http/same-origin";

export function GET(request: Request) {
  return withAdmin(request, async (service, actor) =>
    jsonResponse({ entries: await service.audit(actor, 50) }),
  );
}
