import {
  isValidEmail,
  mayCreateFirstAccount,
  normalizeEmail,
  passwordProblem,
  resolveRole,
  sessionExpiry,
  shouldRenew,
  type Role,
  type RolePolicy,
  type User,
} from "../domain/user";

/** Puertos del módulo de autenticación. */

export interface NewUser {
  readonly email: string | null;
  readonly displayName: string;
  readonly passwordHash: string | null;
  readonly githubId: string | null;
  readonly githubLogin: string | null;
  readonly role: Role;
}

export interface StoredUser extends User {
  readonly passwordHash: string | null;
  readonly githubId: string | null;
}

export interface UserRepository {
  findById(id: string): Promise<StoredUser | null>;
  findByEmail(email: string): Promise<StoredUser | null>;
  findByGithubId(githubId: string): Promise<StoredUser | null>;
  count(): Promise<number>;
  /** Crea el usuario; si es el primero, se decide dentro de la misma transacción (ver `create`). */
  create(user: NewUser, options: { firstUserRole: Role }): Promise<StoredUser>;
  update(
    id: string,
    patch: Partial<Pick<StoredUser, "githubId" | "githubLogin" | "role" | "displayName">>,
  ): Promise<StoredUser>;
  touchLogin(id: string, at: Date): Promise<void>;
}

export interface SessionRepository {
  create(session: {
    idHash: string;
    userId: string;
    expiresAt: Date;
    userAgent: string | null;
  }): Promise<void>;
  find(idHash: string): Promise<{ userId: string; expiresAt: Date } | null>;
  extend(idHash: string, expiresAt: Date): Promise<void>;
  delete(idHash: string): Promise<void>;
  deleteExpired(now: Date): Promise<number>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export interface TokenService {
  /** Token aleatorio con al menos 256 bits de entropía, apto para una cookie. */
  generate(): string;
  /** Hash determinista del token para guardarlo y buscarlo sin conservar el token. */
  hash(token: string): string;
}

export interface AuthConfig extends RolePolicy {
  /** Si es `false`, sólo se puede crear la primera cuenta (instalación personal). */
  readonly allowSignup: boolean;
}

export class AuthError extends Error {
  constructor(
    readonly code: "invalid_input" | "invalid_credentials" | "signup_closed" | "already_exists",
    message: string,
  ) {
    super(message);
  }
}

export interface IssuedSession {
  readonly user: User;
  readonly token: string;
  readonly expiresAt: Date;
}

export interface GithubProfile {
  readonly id: string;
  readonly login: string;
  readonly name: string | null;
  /** Sólo un email principal **verificado** por GitHub permite vincular con una cuenta existente. */
  readonly verifiedEmail: string | null;
}

const INVALID_CREDENTIALS = "Email o contraseña incorrectos.";

/**
 * Casos de uso de autenticación. No conoce HTTP ni cookies: recibe datos validados y devuelve el token de sesión
 * que el adaptador HTTP pondrá en una cookie `HttpOnly`.
 */
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly config: AuthConfig,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async register(input: { email: string; password: string; displayName: string }, userAgent: string | null) {
    const email = normalizeEmail(input.email);
    if (!isValidEmail(email)) throw new AuthError("invalid_input", "El email no es válido.");
    const problem = passwordProblem(input.password);
    if (problem) throw new AuthError("invalid_input", problem);
    const displayName = input.displayName.trim().slice(0, 80) || email.split("@")[0]!;
    await this.assertCanSignUp({ email, githubLogin: null });
    if (await this.users.findByEmail(email)) {
      throw new AuthError("already_exists", "Ya existe una cuenta con ese email.");
    }
    const user = await this.users.create(
      {
        email,
        displayName,
        passwordHash: await this.hasher.hash(input.password),
        githubId: null,
        githubLogin: null,
        role: resolveRole({ email, githubLogin: null }, this.config, false),
      },
      { firstUserRole: "admin" },
    );
    return this.issue(user, userAgent);
  }

  async login(input: { email: string; password: string }, userAgent: string | null): Promise<IssuedSession> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));
    // Se verifica igual contra un hash ficticio para que el tiempo de respuesta no revele si el email existe.
    const ok = await this.hasher.verify(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !user.passwordHash || !ok) throw new AuthError("invalid_credentials", INVALID_CREDENTIALS);
    return this.issue(await this.syncRole(user), userAgent);
  }

  async loginWithGithub(profile: GithubProfile, userAgent: string | null): Promise<IssuedSession> {
    const byGithub = await this.users.findByGithubId(profile.id);
    if (byGithub) {
      const updated =
        byGithub.githubLogin === profile.login
          ? byGithub
          : await this.users.update(byGithub.id, { githubLogin: profile.login });
      return this.issue(await this.syncRole(updated), userAgent);
    }
    const email = profile.verifiedEmail ? normalizeEmail(profile.verifiedEmail) : null;
    const byEmail = email ? await this.users.findByEmail(email) : null;
    if (byEmail) {
      const linked = await this.users.update(byEmail.id, {
        githubId: profile.id,
        githubLogin: profile.login,
      });
      return this.issue(await this.syncRole(linked), userAgent);
    }
    await this.assertCanSignUp({ email, githubLogin: profile.login });
    const created = await this.users.create(
      {
        email,
        displayName: (profile.name ?? profile.login).slice(0, 80),
        passwordHash: null,
        githubId: profile.id,
        githubLogin: profile.login,
        role: resolveRole({ email, githubLogin: profile.login }, this.config, false),
      },
      { firstUserRole: "admin" },
    );
    return this.issue(created, userAgent);
  }

  /** Usuario de un token de sesión vigente, con renovación deslizante. `null` si no hay sesión válida. */
  async authenticate(
    token: string | null | undefined,
  ): Promise<{ user: User; renewedUntil: Date | null } | null> {
    if (!token || token.length < 20 || token.length > 200) return null;
    const idHash = this.tokens.hash(token);
    const session = await this.sessions.find(idHash);
    const now = this.clock();
    if (!session) return null;
    if (session.expiresAt <= now) {
      await this.sessions.delete(idHash);
      return null;
    }
    const user = await this.users.findById(session.userId);
    if (!user) return null;
    let renewedUntil: Date | null = null;
    if (shouldRenew(session.expiresAt, now)) {
      renewedUntil = sessionExpiry(now);
      await this.sessions.extend(idHash, renewedUntil);
    }
    return { user: publicUser(user), renewedUntil };
  }

  async logout(token: string | null | undefined): Promise<void> {
    if (token) await this.sessions.delete(this.tokens.hash(token));
  }

  /** La configuración de admins puede cambiar: se aplica en cada inicio de sesión (sólo para promover). */
  /** Registro cerrado: sólo la primera cuenta, y si hay administradores configurados, sólo uno de ellos. */
  private async assertCanSignUp(identity: { email: string | null; githubLogin: string | null }) {
    if (this.config.allowSignup) return;
    if ((await this.users.count()) > 0) {
      throw new AuthError("signup_closed", "El registro está cerrado en esta instalación.");
    }
    if (!mayCreateFirstAccount(identity, this.config)) {
      throw new AuthError(
        "signup_closed",
        "La primera cuenta de esta instalación está reservada para el administrador configurado.",
      );
    }
  }

  private async syncRole(user: StoredUser): Promise<StoredUser> {
    const configured = resolveRole({ email: user.email, githubLogin: user.githubLogin }, this.config, false);
    if (configured === "admin" && user.role !== "admin") return this.users.update(user.id, { role: "admin" });
    return user;
  }

  private async issue(user: StoredUser, userAgent: string | null): Promise<IssuedSession> {
    const now = this.clock();
    const token = this.tokens.generate();
    const expiresAt = sessionExpiry(now);
    await this.sessions.create({
      idHash: this.tokens.hash(token),
      userId: user.id,
      expiresAt,
      userAgent: userAgent?.slice(0, 300) ?? null,
    });
    await this.users.touchLogin(user.id, now);
    // Limpieza oportunista de sesiones vencidas: evita depender de un cron en un entorno serverless.
    if (Math.random() < 0.05) await this.sessions.deleteExpired(now);
    return { user: publicUser(user), token, expiresAt };
  }
}

function publicUser(user: StoredUser): User {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    githubLogin: user.githubLogin,
    hasPassword: user.passwordHash !== null,
    createdAt: user.createdAt,
  };
}

/** Hash scrypt válido de una contraseña aleatoria descartada: sólo sirve para igualar tiempos. */
const DUMMY_HASH =
  "scrypt$16384$8$1$8KxYp2lQ4m3bZ9wV1nR6tA$Qk1o3pH3eG2b4rJ9yWm6s0d1N8fV5cX7zL2aT4uY6iO0pE9wR3qS5dF8gH1jK2lM4nB7vC0xZ3aS6dF9gH2jK5w";
