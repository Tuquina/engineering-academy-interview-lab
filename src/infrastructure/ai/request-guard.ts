import type { z } from "zod";

/**
 * Protección de los endpoints que llaman a un LLM real (MASTER_PROMPT §30: límites de uso, control de costos y
 * protección de credenciales).
 *
 * - Sin `ANTHROPIC_API_KEY` responden 503: la plataforma sigue funcionando con el proveedor local.
 * - Sólo aceptan requests del mismo origen (otro sitio no puede gastar los tokens del dueño).
 * - Limitan tamaño del cuerpo, tasa por cliente y un presupuesto diario de llamadas.
 *
 * Los contadores viven en la memoria del proceso: alcanzan para uso local; con varias instancias (por ejemplo,
 * funciones serverless) cada una cuenta por separado y haría falta un almacén compartido como Redis.
 */

export const MAX_BODY_BYTES = 256_000;

export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Registra un intento; devuelve los ms a esperar si se superó el límite, o 0 si se permite. */
  take(key: string, now: number): number {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return this.windowMs - (now - recent[0]!);
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.hits.clear();
    return 0;
  }
}

export class DailyBudget {
  private day = "";
  private used = 0;

  constructor(private readonly limit: number) {}

  take(now: Date): boolean {
    const day = now.toISOString().slice(0, 10);
    if (day !== this.day) {
      this.day = day;
      this.used = 0;
    }
    if (this.used >= this.limit) return false;
    this.used++;
    return true;
  }
}

const positive = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const perMinute = new SlidingWindowLimiter(positive(process.env.AI_RATE_LIMIT_PER_MINUTE, 30), 60_000);
const daily = new DailyBudget(positive(process.env.AI_DAILY_REQUEST_LIMIT, 500));

export function jsonError(status: number, error: string, headers?: Record<string, string>): Response {
  return Response.json({ error }, { status, headers: { "cache-control": "no-store", ...headers } });
}

/** Valida configuración, origen, límites y cuerpo. Devuelve los datos validados o la respuesta de error. */
export async function guardAiRequest<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return { ok: false, response: jsonError(503, "No hay un proveedor LLM configurado en el servidor.") };
  }
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return { ok: false, response: jsonError(403, "Origen no permitido.") };
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES)
    return { ok: false, response: jsonError(413, "La solicitud es demasiado grande.") };

  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const wait = perMinute.take(client, Date.now());
  if (wait > 0) {
    return {
      ok: false,
      response: jsonError(429, "Demasiadas solicitudes al modelo. Esperá un momento.", {
        "retry-after": String(Math.ceil(wait / 1000)),
      }),
    };
  }
  if (!daily.take(new Date())) {
    return { ok: false, response: jsonError(429, "Se alcanzó el presupuesto diario de llamadas al modelo.") };
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES)
      return { ok: false, response: jsonError(413, "La solicitud es demasiado grande.") };
    body = JSON.parse(text);
  } catch {
    return { ok: false, response: jsonError(400, "El cuerpo no es JSON válido.") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError(400, `Solicitud inválida: ${parsed.error.issues[0]?.message ?? ""}`),
    };
  }
  return { ok: true, data: parsed.data };
}
