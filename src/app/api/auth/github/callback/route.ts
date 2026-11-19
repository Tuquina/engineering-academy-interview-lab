import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  OAUTH_STATE_COOKIE,
  getAuthService,
  getGithubClient,
  setSessionCookie,
} from "@/infrastructure/composition/auth";
import { publicOrigin } from "@/infrastructure/http/same-origin";
import { AuthError } from "@/modules/auth/application/auth-service";

/** Callback de GitHub: valida el `state`, canjea el código, crea o vincula la cuenta y abre la sesión. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (reason: string) =>
    Response.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, publicOrigin(request)), 302);
  const client = getGithubClient();
  const service = getAuthService();
  if (!client || !service) return fail("GitHub no está configurado.");

  const jar = await cookies();
  const expected = jar.get(OAUTH_STATE_COOKIE)?.value ?? "";
  jar.delete(OAUTH_STATE_COOKIE);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  const valid =
    expected.length > 0 &&
    expected.length === state.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(state));
  if (!valid || !code) return fail("La autorización de GitHub no es válida o venció. Probá de nuevo.");

  try {
    const redirectUri = new URL("/api/auth/github/callback", publicOrigin(request)).toString();
    const profile = await client.exchangeCode(code, redirectUri);
    const session = await service.loginWithGithub(profile, request.headers.get("user-agent"));
    await setSessionCookie(session.token, session.expiresAt);
    return Response.redirect(new URL("/account", publicOrigin(request)), 302);
  } catch (cause) {
    return fail(cause instanceof AuthError ? cause.message : "No se pudo iniciar sesión con GitHub.");
  }
}
