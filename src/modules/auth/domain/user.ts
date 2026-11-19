/**
 * Usuarios y sesiones (MASTER_PROMPT §29). Plataforma personal: dos roles alcanzan (`user` y `admin`) y la
 * autorización se decide en el servidor, nunca sólo en la interfaz.
 */

export type Role = "user" | "admin";

export interface User {
  readonly id: string;
  readonly email: string | null;
  readonly displayName: string;
  readonly role: Role;
  readonly githubLogin: string | null;
  readonly hasPassword: boolean;
  readonly createdAt: string;
}

/** Vista pública de la sesión: lo único que llega al navegador. */
export interface SessionUser {
  readonly id: string;
  readonly displayName: string;
  readonly email: string | null;
  readonly role: Role;
  readonly githubLogin: string | null;
}

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    githubLogin: user.githubLogin,
  };
}

export const SESSION_TTL_DAYS = 30;
/** Si a la sesión le quedan menos de estos días, se extiende (expiración deslizante). */
export const SESSION_RENEW_WHEN_DAYS_LEFT = 15;

const DAY_MS = 86_400_000;

export function sessionExpiry(now: Date): Date {
  return new Date(now.getTime() + SESSION_TTL_DAYS * DAY_MS);
}

export function shouldRenew(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() - now.getTime() < SESSION_RENEW_WHEN_DAYS_LEFT * DAY_MS;
}

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 200;

/** Política de contraseñas: largo antes que reglas de composición (recomendación NIST SP 800-63B). */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  if (password.length > PASSWORD_MAX) return `La contraseña no puede superar ${PASSWORD_MAX} caracteres.`;
  if (new Set(password).size < 4) return "La contraseña es demasiado repetitiva.";
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export interface RolePolicy {
  readonly adminEmails: readonly string[];
  readonly adminGithubLogins: readonly string[];
}

/**
 * Rol de una cuenta: admin si figura en la configuración del servidor o si es la primera cuenta de la instalación
 * (la plataforma es personal: quien la instala la administra).
 */
export function resolveRole(
  identity: { email: string | null; githubLogin: string | null },
  policy: RolePolicy,
  isFirstUser: boolean,
): Role {
  if (isFirstUser) return "admin";
  if (identity.email && policy.adminEmails.includes(normalizeEmail(identity.email))) return "admin";
  if (identity.githubLogin && policy.adminGithubLogins.includes(identity.githubLogin.toLowerCase()))
    return "admin";
  return "user";
}

/**
 * Quién puede crear la **primera** cuenta (que será admin) cuando el registro está cerrado. Si la instalación
 * configura administradores (`ADMIN_EMAILS` o `ADMIN_GITHUB_LOGINS`), sólo ellos: en un servidor público nadie puede
 * adelantarse y quedarse con la administración. Sin configuración (uso local), cualquiera, como hasta ahora.
 */
export function mayCreateFirstAccount(
  identity: { email: string | null; githubLogin: string | null },
  policy: RolePolicy,
): boolean {
  if (policy.adminEmails.length === 0 && policy.adminGithubLogins.length === 0) return true;
  return resolveRole(identity, policy, false) === "admin";
}
