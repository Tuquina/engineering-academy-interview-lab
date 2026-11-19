import { describe, expect, it } from "vitest";
import { cacheStampedeSimulation } from "./cache-stampede";
import { SIMULATIONS } from "./catalog";
import { circuitBreakerSimulation } from "./circuit-breaker";
import { loadBalancingSimulation } from "./load-balancing";
import { queueProcessingSimulation } from "./queue-processing";
import { rateLimitingSimulation } from "./rate-limiting";
import { retryBackoffSimulation } from "./retry-backoff";
import {
  createRng,
  percentile,
  sanitizeParameters,
  type ParameterValues,
  type SimulationDefinition,
} from "./simulation";

const SEEDS = [1, 7, 42, 1234];

function run(definition: SimulationDefinition, overrides: ParameterValues, seed = 42) {
  return definition.run(sanitizeParameters(definition, { ...definition.defaults, ...overrides }), seed);
}

const total = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
const last = (values: readonly number[]) => values[values.length - 1]!;
const summaryValue = (result: ReturnType<typeof run>, label: string) =>
  result.summary.find((s) => s.label === label)!.value;

describe("marco de simulación", () => {
  it("el generador es determinista y produce valores en [0, 1)", () => {
    const a = createRng(99);
    const b = createRng(99);
    const values = Array.from({ length: 1000 }, () => a());
    expect(values).toEqual(Array.from({ length: 1000 }, () => b()));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it("calcula percentiles por rango más cercano", () => {
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
    expect(percentile([], 95)).toBe(0);
  });

  it("ajusta parámetros fuera de rango u opciones inválidas", () => {
    const params = sanitizeParameters(loadBalancingSimulation, {
      servers: 999,
      algorithm: "magic",
      rate: Number.NaN,
    });
    expect(params).toMatchObject({ servers: 8, algorithm: "round-robin", rate: 60 });
  });

  it.each(SIMULATIONS.map((s) => [s.slug, s] as const))(
    "%s: misma semilla, mismo resultado; un cuadro y un valor de métrica por tick",
    (_slug, definition) => {
      const a = run(definition, {});
      expect(run(definition, {})).toEqual(a);
      expect(a.frames).toHaveLength(definition.ticks);
      for (const metric of definition.metrics) expect(a.series[metric.key]).toHaveLength(definition.ticks);
      expect(a.summary.length).toBeGreaterThan(0);
    },
  );
});

describe("comportamientos modelados", () => {
  it("con una réplica degradada, least connections tiene mejor p95 que round robin", () => {
    for (const seed of SEEDS) {
      const p95 = (algorithm: string) =>
        Number(
          summaryValue(
            run(loadBalancingSimulation, { algorithm, degraded: "one" }, seed),
            "Latencia p95",
          ).replace(/\D/g, ""),
        );
      expect(p95("least-connections")).toBeLessThan(p95("round-robin"));
    }
  });

  it("el backoff atraviesa la caída mejor que los reintentos inmediatos, y el jitter reduce el pico posterior", () => {
    const percent = (value: string) => Number(value.replace("%", "").replace(",", "."));
    const leadingNumber = (value: string) => Number(/^\d+/.exec(value)![0]);
    for (const seed of SEEDS) {
      const result = (policy: string) => run(retryBackoffSimulation, { policy }, seed);
      const none = result("none");
      expect(total(none.series.attempts!)).toBe(
        Number(summaryValue(none, "Requests originales").replace(/\D/g, "")),
      );
      const success = (policy: string) => percent(summaryValue(result(policy), "Exitosas"));
      expect(success("exponential")).toBeGreaterThan(success("immediate") + 5);
      expect(success("jitter")).toBeGreaterThan(success("immediate") + 5);
      const peak = (policy: string) =>
        leadingNumber(summaryValue(result(policy), "Pico tras la recuperación"));
      expect(peak("jitter")).toBeLessThan(peak("exponential"));
    }
  });

  it("el coalescing reduce el pico de consultas concurrentes a la base", () => {
    for (const seed of SEEDS) {
      const peak = (mitigation: string) =>
        Math.max(...run(cacheStampedeSimulation, { mitigation }, seed).series.dbConcurrent!);
      expect(peak("single-flight")).toBeLessThan(peak("none"));
    }
  });

  it("con tráfico en el borde, la ventana fija deja pasar el doble del límite en un segundo real; la deslizante no", () => {
    const limit = 10;
    const fixed = run(rateLimitingSimulation, { algorithm: "fixed", traffic: "boundary", limit });
    const sliding = run(rateLimitingSimulation, { algorithm: "sliding", traffic: "boundary", limit });
    expect(Math.max(...fixed.series.rolling!)).toBe(2 * limit);
    expect(Math.max(...sliding.series.rolling!)).toBeLessThanOrEqual(limit);
  });

  it("el token bucket nunca acepta más que la capacidad más la recarga de un segundo", () => {
    for (const seed of SEEDS) {
      const result = run(
        rateLimitingSimulation,
        { algorithm: "bucket", traffic: "bursty", limit: 10, capacity: 5 },
        seed,
      );
      expect(Math.max(...result.series.rolling!)).toBeLessThanOrEqual(15);
    }
  });

  it("el circuit breaker reduce las llamadas al proveedor caído y evita agotar el pool", () => {
    for (const seed of SEEDS) {
      const withBreaker = run(circuitBreakerSimulation, { breaker: "on" }, seed);
      const without = run(circuitBreakerSimulation, { breaker: "off" }, seed);
      const outageCalls = (r: typeof withBreaker) =>
        Number(summaryValue(r, "Llamadas durante la caída").replace(/\D/g, ""));
      expect(outageCalls(withBreaker)).toBeLessThan(outageCalls(without) / 3);
      expect(total(withBreaker.series.rejected!)).toBeLessThanOrEqual(total(without.series.rejected!));
      expect(Math.max(...without.series.busy!)).toBe(20);
    }
  });

  it("la idempotencia elimina los efectos duplicados y el particionado elimina el desorden", () => {
    for (const seed of SEEDS) {
      const naive = run(
        queueProcessingSimulation,
        { idempotency: "off", ordering: "shared", crash: 10 },
        seed,
      );
      const safe = run(
        queueProcessingSimulation,
        { idempotency: "on", ordering: "partitioned", crash: 10 },
        seed,
      );
      expect(last(naive.series.duplicates!)).toBeGreaterThan(0);
      expect(last(naive.series.outOfOrder!)).toBeGreaterThan(0);
      expect(last(safe.series.duplicates!)).toBe(0);
      expect(last(safe.series.outOfOrder!)).toBe(0);
    }
  });
});
