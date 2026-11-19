import { cookies } from "next/headers";
import { AuthService } from "@/modules/auth/application/auth-service";
import { RandomTokenService, ScryptPasswordHasher } from "@/modules/auth/infrastructure/crypto-adapters";
import {
  DrizzleSessionRepository,
  DrizzleUserRepository,
} from "@/modules/auth/infrastructure/drizzle-auth-repositories";
import { GithubOAuthClient } from "@/modules/auth/infrastructure/github-oauth";
import type { User } from "@/modules/auth/domain/user";
import { SlidingWindowLimiter } from "../ai/request-guard";
import { getDatabase } from "./database";

/**
 * Raíz de composición de la autenticación en el servidor: elige los adaptadores (Drizzle, scrypt, GitHub) y maneja
 * la cookie de sesión. Las páginas y los Route Handlers sólo usan estas funciones.
 */

export const SESSION_COOKIE = "eal_session";
export const OAUTH_STATE_COOKIE = "eal_oauth_state";

const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

export function getAuthService(): AuthService | null {
  const db = getDatabase();
  if (!db) return null;
  return new AuthService(
    new DrizzleUserRepository(db),
    new DrizzleSessionRepository(db),
    new ScryptPasswordHasher(),
    new RandomTokenService(),
    {
      adminEmails: list(process.env.ADMIN_EMAILS),
      adminGithubLogins: list(process.env.ADMIN_GITHUB_LOGINS),
      allowSignup: process.env.AUTH_ALLOW_SIGNUP === "true",
    },
  );
}

export function getGithubClient(): GithubOAuthClient | null {
  const id = process.env.GITHUB_CLIENT_ID?.trim();
  const secret = process.env.GITHUB_CLIENT_SECRET?.trim();
  return id && secret ? new GithubOAuthClient(id, secret) : null;
}

/** Qué opciones de cuenta ofrece esta instalación (para la interfaz; sin secretos). */
export function getAuthCapabilities() {
  return {
    persistence: getDatabase() !== null,
    github: getGithubClient() !== null,
    signupOpen: process.env.AUTH_ALLOW_SIGNUP === "true",
  };
}

/** Intentos de inicio de sesión por IP y email: frena la fuerza bruta sin bloquear cuentas ajenas. */
export const loginLimiter = new SlidingWindowLimiter(
  Math.max(1, Number(process.env.AUTH_MAX_ATTEMPTS) || 10),
  15 * 60_000,
);

export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/**
 * Usuario de la sesión actual (Server Components y Route Handlers). Si la sesión se renovó, actualiza la cookie
 * cuando el contexto lo permite (en un Server Component la cookie no se puede escribir y se renueva en el próximo
 * Route Handler).
 */
export async function getCurrentUser(): Promise<User | null> {
  const service = getAuthService();
  if (!service) return null;
  const token = await readSessionToken();
  const result = await service.authenticate(token);
  if (!result) return null;
  if (result.renewedUntil && token) {
    try {
      await setSessionCookie(token, result.renewedUntil);
    } catch {
      // Server Component: no se pueden escribir cookies; la sesión ya quedó extendida en la base.
    }
  }
  return result.user;
}
