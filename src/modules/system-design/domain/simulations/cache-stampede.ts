import {
  createRng,
  formatNumber,
  num,
  percentile,
  poisson,
  str,
  type SimFrame,
  type SimulationDefinition,
} from "./simulation";

const HOT_KEY = "hot";
const DB_COMFORT = 8; // consultas concurrentes que la base atiende sin degradarse
const HIT_MS = 2;

/**
 * Cache aside con TTL: aciertos y fallos de caché, y la estampida que se produce cuando una clave muy pedida
 * expira y muchas requests van a la base a la vez. Compara sin mitigación, coalescing (single-flight) y
 * refresco anticipado.
 */
export const cacheStampedeSimulation: SimulationDefinition = {
  slug: "cache-stampede",
  title: "Cache hit, cache miss y cache stampede",
  summary:
    "Una caché con TTL delante de una base. Mirá la tasa de aciertos y qué pasa con la base cuando expira una clave muy pedida.",
  topics: ["Caching", "Cache aside", "Latencia de base de datos", "Cache stampede"],
  whatToObserve: [
    "Sin mitigación, ¿cuántas consultas concurrentes llegan a la base justo cuando expira la clave caliente?",
    "¿Por qué la latencia de la base empeora con la concurrencia y eso alarga la estampida?",
    "¿Qué diferencia hay entre coalescing (una sola consulta por clave) y refrescar antes de que expire?",
  ],
  simplifications: [
    "La latencia de la base crece linealmente con las consultas concurrentes por encima de 8.",
    "Las claves frías se piden de forma uniforme; la clave caliente concentra el porcentaje configurado.",
    "La caché no tiene límite de memoria ni desalojo; sólo expiración por TTL.",
  ],
  realWorld: [
    "En Redis, el coalescing se implementa con un lock corto (SET key NX PX) o en el proceso con una promesa compartida por clave.",
    "Agregar jitter al TTL evita que muchas claves creadas a la vez expiren juntas.",
    "La tasa de aciertos y la latencia de la base se miden con métricas del cliente de caché y del pool de conexiones.",
  ],
  tickMs: 100,
  ticks: 300,
  parameters: [
    {
      kind: "choice",
      key: "mitigation",
      label: "Mitigación",
      options: [
        { value: "none", label: "Ninguna" },
        { value: "single-flight", label: "Coalescing (una consulta por clave)" },
        { value: "early-refresh", label: "Refresco anticipado" },
      ],
    },
    { kind: "number", key: "rate", label: "Requests", min: 50, max: 500, step: 25, unit: "req/s" },
    {
      kind: "number",
      key: "hotShare",
      label: "Tráfico a la clave caliente",
      min: 10,
      max: 80,
      step: 5,
      unit: "%",
    },
    { kind: "number", key: "ttl", label: "TTL", min: 2, max: 20, step: 1, unit: "s" },
    {
      kind: "number",
      key: "dbLatency",
      label: "Latencia base sin carga",
      min: 50,
      max: 500,
      step: 50,
      unit: "ms",
    },
  ],
  defaults: { mitigation: "none", rate: 200, hotShare: 50, ttl: 8, dbLatency: 200 },
  metrics: [
    { key: "hitRate", label: "Tasa de aciertos", unit: "%" },
    { key: "dbConcurrent", label: "Consultas concurrentes en la base", unit: "consultas" },
    { key: "latency", label: "Latencia promedio", unit: "ms" },
  ],
  run(params, seed) {
    const rng = createRng(seed);
    const mitigation = str(params, "mitigation");
    const rate = num(params, "rate");
    const hotShare = num(params, "hotShare") / 100;
    const ttlTicks = (num(params, "ttl") * 1000) / this.tickMs;
    const baseDbTicks = num(params, "dbLatency") / this.tickMs;
    const coldKeys = 200;

    const expiresAt = new Map<string, number>();
    const inFlight = new Map<string, number>(); // clave -> tick en que termina la consulta (para coalescing)
    const dbQueries: Array<{ key: string; endsAt: number }> = [];
    const latencies: number[] = [];
    const frames: SimFrame[] = [];
    const series = { hitRate: [] as number[], dbConcurrent: [] as number[], latency: [] as number[] };
    let hits = 0;
    let total = 0;
    let peakDb = 0;
    let hotWasCached = false;

    for (let tick = 0; tick < this.ticks; tick++) {
      const events: string[] = [];
      // Terminan las consultas: la clave queda en caché con su TTL.
      for (let i = dbQueries.length - 1; i >= 0; i--) {
        const query = dbQueries[i]!;
        if (query.endsAt <= tick) {
          expiresAt.set(query.key, tick + ttlTicks);
          if (inFlight.get(query.key) === query.endsAt) inFlight.delete(query.key);
          dbQueries.splice(i, 1);
        }
      }
      const hotCached = (expiresAt.get(HOT_KEY) ?? -1) > tick;
      if (hotWasCached && !hotCached) events.push("La clave caliente expiró.");
      hotWasCached = hotCached;

      const arrivals = poisson(rng, (rate * this.tickMs) / 1000);
      let tickHits = 0;
      let tickLatency = 0;
      let hotMisses = 0;
      for (let i = 0; i < arrivals; i++) {
        const key = rng() < hotShare ? HOT_KEY : `k${Math.floor(rng() * coldKeys)}`;
        total++;
        const expiry = expiresAt.get(key) ?? -1;
        if (expiry > tick) {
          hits++;
          tickHits++;
          tickLatency += HIT_MS;
          latencies.push(HIT_MS);
          const remaining = expiry - tick;
          if (mitigation === "early-refresh" && remaining < ttlTicks * 0.2 && !inFlight.has(key)) {
            const duration = Math.ceil(baseDbTicks * Math.max(1, (dbQueries.length + 1) / DB_COMFORT));
            dbQueries.push({ key, endsAt: tick + duration });
            inFlight.set(key, tick + duration);
          }
          continue;
        }
        if (key === HOT_KEY) hotMisses++;
        const pending = inFlight.get(key);
        if (mitigation !== "none" && pending !== undefined) {
          const ms = (pending - tick) * this.tickMs;
          tickLatency += ms;
          latencies.push(ms);
          continue;
        }
        const duration = Math.ceil(baseDbTicks * Math.max(1, (dbQueries.length + 1) / DB_COMFORT));
        dbQueries.push({ key, endsAt: tick + duration });
        if (!inFlight.has(key)) inFlight.set(key, tick + duration);
        const ms = duration * this.tickMs;
        tickLatency += ms;
        latencies.push(ms);
      }
      if (hotMisses > 10 && mitigation === "none") {
        events.push(`${hotMisses} requests de la clave caliente fueron a la base en este tick.`);
      }
      peakDb = Math.max(peakDb, dbQueries.length);
      series.hitRate.push(arrivals === 0 ? 0 : Math.round((tickHits / arrivals) * 100));
      series.dbConcurrent.push(dbQueries.length);
      series.latency.push(arrivals === 0 ? 0 : Math.round(tickLatency / arrivals));

      const hotRemaining = Math.max(0, (expiresAt.get(HOT_KEY) ?? 0) - tick);
      frames.push({
        tick,
        events,
        entities: [
          {
            id: "hot-key",
            label: "Clave caliente (TTL restante)",
            value: hotRemaining,
            max: ttlTicks,
            status: hotRemaining > 0 ? "ok" : inFlight.has(HOT_KEY) ? "warning" : "down",
            detail:
              hotRemaining > 0 ? `${formatNumber((hotRemaining * this.tickMs) / 1000, 1)} s` : "expirada",
          },
          {
            id: "db",
            label: "Base de datos",
            value: dbQueries.length,
            max: DB_COMFORT * 4,
            status:
              dbQueries.length > DB_COMFORT * 2
                ? "down"
                : dbQueries.length > DB_COMFORT
                  ? "warning"
                  : dbQueries.length > 0
                    ? "busy"
                    : "idle",
            detail: `${dbQueries.length} consultas en curso`,
          },
        ],
      });
    }

    return {
      frames,
      series,
      summary: [
        { label: "Tasa de aciertos", value: `${formatNumber((hits / Math.max(1, total)) * 100, 1)}%` },
        { label: "Pico de consultas concurrentes", value: formatNumber(peakDb) },
        { label: "Latencia p50", value: `${formatNumber(percentile(latencies, 50))} ms` },
        { label: "Latencia p95", value: `${formatNumber(percentile(latencies, 95))} ms` },
        { label: "Latencia p99", value: `${formatNumber(percentile(latencies, 99))} ms` },
      ],
    };
  },
};
