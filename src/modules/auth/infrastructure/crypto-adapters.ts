import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import type { PasswordHasher, TokenService } from "../application/auth-service";

const scryptAsync = (password: string, salt: Buffer, keylen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, keylen, options, (error, key) => (error ? reject(error) : resolve(key))),
  );

const N = 16_384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

/**
 * Contraseñas con scrypt (incluido en Node, sin dependencias nativas). Formato:
 * `scrypt$N$r$p$sal$hash` en base64url, para poder subir los parámetros en el futuro sin invalidar hashes viejos.
 */
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, { N, r: R, p: P });
    return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [scheme, n, r, p, salt, expected] = stored.split("$");
    if (scheme !== "scrypt" || !salt || !expected) return false;
    const expectedKey = Buffer.from(expected, "base64url");
    const params = { N: Number(n), r: Number(r), p: Number(p) };
    if (![params.N, params.r, params.p].every(Number.isInteger) || params.N > 2 ** 17) return false;
    const key = await scryptAsync(
      password.normalize("NFKC"),
      Buffer.from(salt, "base64url"),
      expectedKey.length,
      params,
    );
    return key.length === expectedKey.length && timingSafeEqual(key, expectedKey);
  }
}

/** Tokens de sesión: 32 bytes aleatorios; en la base sólo se guarda su SHA-256. */
export class RandomTokenService implements TokenService {
  generate(): string {
    return randomBytes(32).toString("base64url");
  }

  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
