import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { DailyBudget, SlidingWindowLimiter, guardAiRequest } from "./request-guard";

const schema = z.object({ text: z.string().max(10) });

const post = (body: string, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/mentor", { method: "POST", body, headers });

describe("límites de uso", () => {
  it("la ventana deslizante limita por cliente", () => {
    const limiter = new SlidingWindowLimiter(2, 60_000);
    expect(limiter.take("a", 0)).toBe(0);
    expect(limiter.take("a", 1_000)).toBe(0);
    expect(limiter.take("a", 2_000)).toBeGreaterThan(0);
    expect(limiter.take("b", 2_000)).toBe(0);
    expect(limiter.take("a", 61_000)).toBe(0);
  });

  it("el presupuesto diario se reinicia al cambiar el día (UTC)", () => {
    const budget = new DailyBudget(1);
    expect(budget.take(new Date("2026-03-05T10:00:00Z"))).toBe(true);
    expect(budget.take(new Date("2026-03-05T11:00:00Z"))).toBe(false);
    expect(budget.take(new Date("2026-03-06T00:00:00Z"))).toBe(true);
  });
});

describe("guardAiRequest", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sin API key responde 503 y la plataforma sigue con el proveedor local", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const result = await guardAiRequest(post('{"text":"hola"}'), schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(503);
  });

  it("rechaza otros orígenes y cuerpos inválidos", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const foreign = await guardAiRequest(
      post('{"text":"hola"}', { origin: "https://otro-sitio.example" }),
      schema,
    );
    expect(!foreign.ok && foreign.response.status).toBe(403);
    const invalid = await guardAiRequest(post('{"text":"demasiado largo"}'), schema);
    expect(!invalid.ok && invalid.response.status).toBe(400);
    const valid = await guardAiRequest(post('{"text":"hola"}', { origin: "http://localhost:3000" }), schema);
    expect(valid).toEqual({ ok: true, data: { text: "hola" } });
  });
});
