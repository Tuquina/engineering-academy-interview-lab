import type { GithubProfile } from "../application/auth-service";

/**
 * Cliente mínimo de OAuth de GitHub (flujo de código de autorización). Se usa sólo si `GITHUB_CLIENT_ID` y
 * `GITHUB_CLIENT_SECRET` están configurados. El `state` aleatorio (guardado en una cookie `HttpOnly`) evita CSRF en
 * el callback.
 */
export class GithubOAuthClient {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  authorizeUrl(redirectUri: string, state: string): string {
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "read:user user:email");
    url.searchParams.set("state", state);
    url.searchParams.set("allow_signup", "false");
    return url.toString();
  }

  async exchangeCode(code: string, redirectUri: string): Promise<GithubProfile> {
    const tokenResponse = await this.fetchImpl("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = (await tokenResponse.json()) as { access_token?: string; error_description?: string };
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description ?? "GitHub no entregó un token de acceso.");
    }
    const headers = {
      authorization: `Bearer ${tokenData.access_token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "interview-lab",
    };
    const [userResponse, emailsResponse] = await Promise.all([
      this.fetchImpl("https://api.github.com/user", { headers }),
      this.fetchImpl("https://api.github.com/user/emails", { headers }),
    ]);
    if (!userResponse.ok) throw new Error("No se pudo leer el perfil de GitHub.");
    const user = (await userResponse.json()) as { id: number; login: string; name: string | null };
    const emails = emailsResponse.ok
      ? ((await emailsResponse.json()) as { email: string; primary: boolean; verified: boolean }[])
      : [];
    const primary = emails.find((e) => e.primary && e.verified);
    return { id: String(user.id), login: user.login, name: user.name, verifiedEmail: primary?.email ?? null };
  }
}
