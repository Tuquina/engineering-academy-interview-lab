import { clearSessionCookie, getAuthService, readSessionToken } from "@/infrastructure/composition/auth";
import { isSameOrigin, jsonError, jsonResponse } from "@/infrastructure/http/same-origin";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Origen no permitido.");
  await getAuthService()?.logout(await readSessionToken());
  await clearSessionCookie();
  return jsonResponse({ ok: true });
}
