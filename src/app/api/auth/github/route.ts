import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { OAUTH_STATE_COOKIE, getAuthService, getGithubClient } from "@/infrastructure/composition/auth";
import { jsonError, publicOrigin } from "@/infrastructure/http/same-origin";

/** Inicia el flujo OAuth con GitHub: genera el `state`, lo guarda en una cookie y redirige. */
export async function GET(request: Request) {
  const client = getGithubClient();
  if (!client || !getAuthService())
    return jsonError(503, "El inicio de sesión con GitHub no está configurado.");
  const state = randomBytes(24).toString("base64url");
  (await cookies()).set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/github",
    maxAge: 600,
  });
  const redirectUri = new URL("/api/auth/github/callback", publicOrigin(request)).toString();
  return Response.redirect(client.authorizeUrl(redirectUri, state), 302);
}
