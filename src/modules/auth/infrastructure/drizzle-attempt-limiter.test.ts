import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../../../../tests/support/test-database";
import { DrizzleAttemptLimiter } from "./drizzle-attempt-limiter";

describe("límite de intentos compartido (PGlite)", () => {
  let test: Awaited<ReturnType<typeof createTestDatabase>>;
  beforeAll(async () => {
    test = await createTestDatabase();
  }, 30_000);
  afterAll(() => test.close());

  it("permite hasta el límite, bloquea después y reinicia al vencer la ventana", async () => {
    const limiter = new DrizzleAttemptLimiter(test.db, 3, 60_000);
    const t0 = new Date("2026-11-19T10:00:00Z");
    for (let i = 0; i < 3; i++) expect(await limiter.take("login:1.2.3.4:a@b.c", t0)).toBe(0);
    const wait = await limiter.take("login:1.2.3.4:a@b.c", new Date(t0.getTime() + 10_000));
    expect(wait).toBe(50_000);
    // Otra clave no se ve afectada.
    expect(await limiter.take("login:1.2.3.4:otra@b.c", t0)).toBe(0);
    // Vencida la ventana, se vuelve a permitir.
    expect(await limiter.take("login:1.2.3.4:a@b.c", new Date(t0.getTime() + 61_000))).toBe(0);
  });

  it("cuenta bien con intentos concurrentes", async () => {
    const limiter = new DrizzleAttemptLimiter(test.db, 5, 60_000);
    const now = new Date("2026-11-19T11:00:00Z");
    const waits = await Promise.all(Array.from({ length: 8 }, () => limiter.take("register:9.9.9.9", now)));
    expect(waits.filter((w) => w === 0)).toHaveLength(5);
  });
});
