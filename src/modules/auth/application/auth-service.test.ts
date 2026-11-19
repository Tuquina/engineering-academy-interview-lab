import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../../../../tests/support/test-database";
import { RandomTokenService, ScryptPasswordHasher } from "../infrastructure/crypto-adapters";
import { DrizzleSessionRepository, DrizzleUserRepository } from "../infrastructure/drizzle-auth-repositories";
import { passwordProblem, resolveRole, shouldRenew } from "../domain/user";
import { AuthError, AuthService, type AuthConfig } from "./auth-service";

describe("dominio de usuarios", () => {
  it("valida la contraseña por largo y repetición", () => {
    expect(passwordProblem("corta")).toMatch(/al menos/);
    expect(passwordProblem("aaaaaaaaaaaa")).toMatch(/repetitiva/);
    expect(passwordProblem("una frase larga y segura")).toBeNull();
  });

  it("la primera cuenta es admin; después, sólo las configuradas", () => {
    const policy = { adminEmails: ["admin@x.dev"], adminGithubLogins: ["octocat"] };
    expect(resolveRole({ email: "a@b.c", githubLogin: null }, policy, true)).toBe("admin");
    expect(resolveRole({ email: "Admin@X.dev", githubLogin: null }, policy, false)).toBe("admin");
    expect(resolveRole({ email: null, githubLogin: "OctoCat" }, policy, false)).toBe("admin");
    expect(resolveRole({ email: "a@b.c", githubLogin: null }, policy, false)).toBe("user");
  });

  it("renueva la sesión cuando le quedan pocos días", () => {
    const now = new Date("2026-03-01T00:00:00Z");
    expect(shouldRenew(new Date("2026-03-10T00:00:00Z"), now)).toBe(true);
    expect(shouldRenew(new Date("2026-03-25T00:00:00Z"), now)).toBe(false);
  });
});

describe("AuthService contra PostgreSQL (PGlite)", () => {
  let close: () => Promise<void>;
  let make: (config?: Partial<AuthConfig>) => AuthService;

  beforeAll(async () => {
    const test = await createTestDatabase();
    close = test.close;
    make = (config = {}) =>
      new AuthService(
        new DrizzleUserRepository(test.db),
        new DrizzleSessionRepository(test.db),
        new ScryptPasswordHasher(),
        new RandomTokenService(),
        { adminEmails: [], adminGithubLogins: [], allowSignup: false, ...config },
      );
  }, 30_000);

  afterAll(() => close());

  it("registra la primera cuenta como admin y abre una sesión", async () => {
    const service = make();
    const session = await service.register(
      { email: "Owner@Example.com", password: "una frase larga y segura", displayName: "Owner" },
      "vitest",
    );
    expect(session.user).toMatchObject({ email: "owner@example.com", role: "admin", hasPassword: true });
    const auth = await service.authenticate(session.token);
    expect(auth?.user.id).toBe(session.user.id);
  });

  it("con el registro cerrado no se pueden crear más cuentas", async () => {
    await expect(
      make().register(
        { email: "otra@example.com", password: "otra frase larga segura", displayName: "" },
        null,
      ),
    ).rejects.toMatchObject({ code: "signup_closed" });
  });

  it("no revela si el email existe y rechaza contraseñas incorrectas", async () => {
    const service = make();
    await expect(
      service.login({ email: "owner@example.com", password: "incorrecta123" }, null),
    ).rejects.toThrow("Email o contraseña incorrectos.");
    await expect(
      service.login({ email: "nadie@example.com", password: "incorrecta123" }, null),
    ).rejects.toThrow("Email o contraseña incorrectos.");
    const ok = await service.login(
      { email: "OWNER@example.com", password: "una frase larga y segura" },
      null,
    );
    expect(ok.user.role).toBe("admin");
  });

  it("con registro abierto, una cuenta nueva es usuario común y no duplica emails", async () => {
    const service = make({ allowSignup: true });
    const user = await service.register(
      { email: "alumno@example.com", password: "frase larga del alumno", displayName: "Alumno" },
      null,
    );
    expect(user.user.role).toBe("user");
    await expect(
      service.register(
        { email: "ALUMNO@example.com", password: "frase larga del alumno", displayName: "" },
        null,
      ),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("GitHub vincula por email verificado y promueve logins configurados", async () => {
    const service = make({ allowSignup: true, adminGithubLogins: ["alumno-gh"] });
    const linked = await service.loginWithGithub(
      { id: "42", login: "alumno-gh", name: "Alumno", verifiedEmail: "alumno@example.com" },
      null,
    );
    expect(linked.user).toMatchObject({
      email: "alumno@example.com",
      githubLogin: "alumno-gh",
      role: "admin",
    });
    const again = await service.loginWithGithub(
      { id: "42", login: "alumno-gh", name: null, verifiedEmail: null },
      null,
    );
    expect(again.user.id).toBe(linked.user.id);
  });

  it("cerrar sesión invalida el token", async () => {
    const service = make();
    const session = await service.login(
      { email: "owner@example.com", password: "una frase larga y segura" },
      null,
    );
    await service.logout(session.token);
    expect(await service.authenticate(session.token)).toBeNull();
    expect(await service.authenticate("token-inventado-que-no-existe-en-la-base")).toBeNull();
  });
});
