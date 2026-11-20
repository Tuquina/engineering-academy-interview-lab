import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const request = (authorization?: string) =>
  new Request("http://localhost/api/cron/keep-alive", {
    headers: authorization ? { authorization } : {},
  });

describe("GET /api/cron/keep-alive", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rechaza la llamada si CRON_SECRET no está configurado", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request("Bearer "))).status).toBe(401);
  });

  it("rechaza un secreto incorrecto o ausente", async () => {
    vi.stubEnv("CRON_SECRET", "secreto-de-prueba");
    expect((await GET(request("Bearer otro"))).status).toBe(401);
    expect((await GET(request())).status).toBe(401);
  });

  it("con el secreto correcto y sin base responde 503", async () => {
    vi.stubEnv("CRON_SECRET", "secreto-de-prueba");
    vi.stubEnv("DATABASE_URL", "");
    expect((await GET(request("Bearer secreto-de-prueba"))).status).toBe(503);
  });
});
