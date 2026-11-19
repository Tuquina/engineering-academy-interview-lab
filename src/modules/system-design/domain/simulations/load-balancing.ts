import {
  createRng,
  formatNumber,
  num,
  percentile,
  poisson,
  str,
  type SimEntity,
  type SimFrame,
  type SimulationDefinition,
} from "./simulation";

const CONCURRENCY = 8;
const MAX_QUEUE = 40;
const BASE_WORK = 2; // ticks (200 ms) para una request normal
const HEAVY_FACTOR = 5;

interface Request {
  arrival: number;
  remaining: number;
}

interface Server {
  inFlight: Request[];
  queue: Request[];
  speed: number;
  warnedQueue: boolean;
}

/**
 * Balanceo de carga y escalado horizontal: requests con duración variable repartidas entre réplicas con
 * round robin, least connections o al azar. Una réplica puede estar degradada.
 */
export const loadBalancingSimulation: SimulationDefinition = {
  slug: "load-balancing",
  title: "Balanceo de carga y escalado horizontal",
  summary:
    "Requests con duraciones distintas repartidas entre réplicas. Compará algoritmos, agregá réplicas y mirá qué pasa cuando una se degrada.",
  topics: ["Load balancing", "Escalado horizontal", "Latencia", "Throughput", "Stateless services"],
  whatToObserve: [
    "Con un servidor degradado, ¿por qué round robin empeora el p95 y least connections no tanto?",
    "¿Cuántas réplicas hacen falta para que la cola no crezca con 120 req/s? ¿Qué pasa con una menos?",
    "¿Cómo cambia la latencia cuando aumenta la proporción de requests pesadas aunque el promedio de carga sea similar?",
  ],
  simplifications: [
    "Cada réplica atiende hasta 8 requests en paralelo y encola el resto (máximo 40); no hay timeouts del cliente.",
    "Las llegadas siguen una distribución de Poisson; las requests normales tardan 200 ms y las pesadas 5 veces más.",
    "El balanceador conoce al instante las conexiones activas de cada réplica (en la realidad, la información llega con retraso y cada balanceador ve sólo su parte).",
  ],
  realWorld: [
    "Los balanceadores reales usan health checks para sacar réplicas caídas, pero una réplica lenta suele pasarlos: por eso least connections o 'power of two choices' ayudan.",
    "El autoescalado reacciona con minutos de retraso; el margen de capacidad se planifica para los picos.",
    "La latencia se mide en percentiles (p95, p99) en el balanceador o con trazas, no con promedios.",
  ],
  tickMs: 100,
  ticks: 300,
  parameters: [
    { kind: "number", key: "servers", label: "Réplicas", min: 1, max: 8, step: 1 },
    { kind: "number", key: "rate", label: "Llegadas", min: 10, max: 200, step: 10, unit: "req/s" },
    { kind: "number", key: "heavyShare", label: "Requests pesadas", min: 0, max: 40, step: 5, unit: "%" },
    {
      kind: "choice",
      key: "algorithm",
      label: "Algoritmo",
      options: [
        { value: "round-robin", label: "Round robin" },
        { value: "least-connections", label: "Least connections" },
        { value: "random", label: "Aleatorio" },
      ],
    },
    {
      kind: "choice",
      key: "degraded",
      label: "Réplica degradada",
      options: [
        { value: "none", label: "Ninguna" },
        { value: "one", label: "Réplica 1 va 4× más lenta" },
      ],
    },
  ],
  defaults: { servers: 3, rate: 60, heavyShare: 10, algorithm: "round-robin", degraded: "one" },
  metrics: [
    { key: "p95", label: "Latencia p95 (último segundo)", unit: "ms" },
    { key: "queued", label: "Requests en cola", unit: "req" },
    { key: "dropped", label: "Rechazadas (acumulado)", unit: "req" },
  ],
  run(params, seed) {
    const rng = createRng(seed);
    const serverCount = num(params, "servers");
    const rate = num(params, "rate");
    const heavyShare = num(params, "heavyShare") / 100;
    const algorithm = str(params, "algorithm");
    const degraded = str(params, "degraded") === "one";
    const servers: Server[] = Array.from({ length: serverCount }, (_, i) => ({
      inFlight: [],
      queue: [],
      speed: degraded && i === 0 ? 0.25 : 1,
      warnedQueue: false,
    }));
    const frames: SimFrame[] = [];
    const series = { p95: [] as number[], queued: [] as number[], dropped: [] as number[] };
    const latencies: number[] = [];
    const recent: Array<{ tick: number; ms: number }> = [];
    let dropped = 0;
    let rr = 0;
    let maxQueue = 0;

    for (let tick = 0; tick < this.ticks; tick++) {
      const events: string[] = [];
      const arrivals = poisson(rng, (rate * this.tickMs) / 1000);
      for (let i = 0; i < arrivals; i++) {
        const request: Request = {
          arrival: tick,
          remaining: BASE_WORK * (rng() < heavyShare ? HEAVY_FACTOR : 1),
        };
        let index: number;
        if (algorithm === "round-robin") index = rr++ % serverCount;
        else if (algorithm === "random") index = Math.floor(rng() * serverCount);
        else {
          index = 0;
          for (let s = 1; s < serverCount; s++) {
            const load = (x: Server) => x.inFlight.length + x.queue.length;
            if (load(servers[s]!) < load(servers[index]!)) index = s;
          }
        }
        const server = servers[index]!;
        if (server.inFlight.length < CONCURRENCY) server.inFlight.push(request);
        else if (server.queue.length < MAX_QUEUE) server.queue.push(request);
        else {
          dropped++;
          if (dropped === 1) events.push(`La réplica ${index + 1} rechaza requests: su cola está llena.`);
        }
      }

      servers.forEach((server, index) => {
        for (const request of server.inFlight) request.remaining -= server.speed;
        const done = server.inFlight.filter((r) => r.remaining <= 0);
        server.inFlight = server.inFlight.filter((r) => r.remaining > 0);
        for (const request of done) {
          const ms = (tick + 1 - request.arrival) * this.tickMs;
          latencies.push(ms);
          recent.push({ tick, ms });
        }
        while (server.inFlight.length < CONCURRENCY && server.queue.length > 0)
          server.inFlight.push(server.queue.shift()!);
        if (server.queue.length > 10 && !server.warnedQueue) {
          server.warnedQueue = true;
          events.push(`La réplica ${index + 1} acumula ${server.queue.length} requests en cola.`);
        }
        if (server.queue.length === 0) server.warnedQueue = false;
      });

      while (recent.length > 0 && recent[0]!.tick <= tick - 10) recent.shift();
      const queued = servers.reduce((sum, s) => sum + s.queue.length, 0);
      maxQueue = Math.max(maxQueue, queued);
      series.p95.push(
        percentile(
          recent.map((r) => r.ms),
          95,
        ),
      );
      series.queued.push(queued);
      series.dropped.push(dropped);

      const entities: SimEntity[] = servers.map((server, index) => ({
        id: `server-${index + 1}`,
        label: `Réplica ${index + 1}${server.speed < 1 ? " (degradada)" : ""}`,
        value: server.inFlight.length + server.queue.length,
        max: CONCURRENCY + 16,
        status:
          server.queue.length >= MAX_QUEUE
            ? "down"
            : server.queue.length > 0
              ? "warning"
              : server.inFlight.length > 0
                ? "busy"
                : "idle",
        detail: `${server.inFlight.length}/${CONCURRENCY} activas · cola ${server.queue.length}`,
      }));
      frames.push({ tick, entities, events });
    }

    return {
      frames,
      series,
      summary: [
        { label: "Completadas", value: formatNumber(latencies.length) },
        { label: "Rechazadas", value: formatNumber(dropped) },
        { label: "Latencia p50", value: `${formatNumber(percentile(latencies, 50))} ms` },
        { label: "Latencia p95", value: `${formatNumber(percentile(latencies, 95))} ms` },
        { label: "Latencia p99", value: `${formatNumber(percentile(latencies, 99))} ms` },
        { label: "Cola máxima", value: formatNumber(maxQueue) },
      ],
    };
  },
};
