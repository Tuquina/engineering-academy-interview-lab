import { getAuthCapabilities, getCurrentUser } from "@/infrastructure/composition/auth";
import { jsonResponse } from "@/infrastructure/http/same-origin";
import { toSessionUser } from "@/modules/auth/domain/user";

/** Sesión actual y capacidades de la instalación. Nunca devuelve datos de otros usuarios ni secretos. */
export async function GET() {
  const user = await getCurrentUser();
  return jsonResponse({ user: user ? toSessionUser(user) : null, capabilities: getAuthCapabilities() });
}
