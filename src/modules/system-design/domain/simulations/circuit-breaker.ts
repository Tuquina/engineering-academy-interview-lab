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

const OUTAGE_START = 50;
const HEALTHY_TICKS = 2; // 200 ms

type BreakerState =
  | { kind: "closed"; failures: number }
  | { kind: "open"; until: number }
  | { kind: "half-open"; probing: boolean };

interface Call {
  start: number;
  endsAt: number;
  ok: boolean;
  probe: boolean;
}

/**
 * Caída de un servicio externo con y sin circuit breaker. Sin breaker, las llamadas esperan el timeout y agotan el
 * pool de workers del servicio que llama; con breaker, falla rápido, usa un fallback y prueba la recuperación.
 */
export const circuitBreakerSimulation: SimulationDefinition = {
  slug: "circuit-breaker",
  title: "Caída de un servicio y circuit breaker",
  summary:
    "Un proveedor externo deja de responder. Compará qué pasa con el pool de workers y la latencia con y sin circuit breaker.",
  topics: ["Circuit breakers", "Caída de un servicio", "Timeouts", "Bulkhead", "Disponibilidad"],
  whatToObserve: [
    "Sin breaker, ¿cuánto tarda en agotarse el pool y qué les pasa a las requests que no dependen del proveedor?",
    "Con breaker, ¿cuántas llamadas llegan al proveedor durante la caída?",
    "¿Qué efecto tiene un timeout más corto, aun sin breaker?",
  ],
  simplifications: [
    "Durante la caída el proveedor no responde y cada llamada termina por timeout; fuera de ella responde en 200 ms.",
    "El breaker abre tras N fallas consecutivas y en semiabierto deja pasar una sola llamada de prueba.",
    "Cada request ocupa un worker del pool mientras espera; sin workers libres se rechaza de inmediato.",
  ],
  realWorld: [
    "Las librerías de resiliencia suelen abrir por porcentaje de fallas en una ventana y con un mínimo de llamadas.",
    "Separar pools por dependencia (bulkhead) evita que un proveedor lento consuma los recursos de los demás.",
    "Las métricas clave son el estado del breaker, la tasa de fallbacks y la saturación de pools y conexiones.",
  ],
  tickMs: 100,
  ticks: 300,
  parameters: [
    {
      kind: "choice",
      key: "breaker",
      label: "Circuit breaker",
      options: [
        { value: "on", label: "Activado" },
        { value: "off", label: "Desactivado" },
      ],
    },
    { kind: "number", key: "threshold", label: "Fallas para abrir", min: 2, max: 20, step: 1 },
    { kind: "number", key: "openSeconds", label: "Tiempo abierto", min: 1, max: 10, step: 1, unit: "s" },
    { kind: "number", key: "timeoutMs", label: "Timeout", min: 500, max: 5000, step: 500, unit: "ms" },
    { kind: "number", key: "rate", label: "Llamadas", min: 5, max: 60, step: 5, unit: "req/s" },
    { kind: "number", key: "workers", label: "Workers del pool", min: 5, max: 60, step: 5 },
    { kind: "number", key: "outage", label: "Duración de la caída", min: 3, max: 20, step: 1, unit: "s" },
  ],
  defaults: {
    breaker: "on",
    threshold: 5,
    openSeconds: 5,
    timeoutMs: 2000,
    rate: 20,
    workers: 20,
    outage: 10,
  },
  metrics: [
    { key: "busy", label: "Workers ocupados", unit: "workers" },
    { key: "providerCalls", label: "Llamadas al proveedor por tick", unit: "req" },
    { key: "rejected", label: "Rechazadas por pool agotado (por tick)", unit: "req" },
    { key: "fallbacks", label: "Fallbacks por tick", unit: "req" },
  ],
  run(params, seed) {
    const rng = createRng(seed);
    const useBreaker = str(params, "breaker") === "on";
    const threshold = num(params, "threshold");
    const openTicks = (num(params, "openSeconds") * 1000) / this.tickMs;
    const timeoutTicks = num(params, "timeoutMs") / this.tickMs;
    const rate = num(params, "rate");
    const workers = num(params, "workers");
    const outageEnd = OUTAGE_START + (num(params, "outage") * 1000) / this.tickMs;
    let state: BreakerState = { kind: "closed", failures: 0 };
    let calls: Call[] = [];
    const latencies: number[] = [];
    const frames: SimFrame[] = [];
    const series = {
      busy: [] as number[],
      providerCalls: [] as number[],
      rejected: [] as number[],
      fallbacks: [] as number[],
    };
    let ok = 0;
    let fallbacks = 0;
    let rejected = 0;
    let callsDuringOutage = 0;

    for (let tick = 0; tick < this.ticks; tick++) {
      const events: string[] = [];
      if (tick === OUTAGE_START) events.push("El proveedor deja de responder.");
      if (tick === outageEnd) events.push("El proveedor vuelve a responder.");
      const down = tick >= OUTAGE_START && tick < outageEnd;

      // Terminan llamadas: actualizan el breaker.
      for (const call of calls.filter((c) => c.endsAt <= tick)) {
        latencies.push((call.endsAt - call.start) * this.tickMs);
        if (call.ok) ok++;
        else fallbacks++; // timeout: el que llama responde con el fallback tras esperar
        if (!useBreaker) continue;
        if (call.ok) {
          if (state.kind !== "closed" || state.failures > 0) {
            if (state.kind === "half-open")
              events.push("La llamada de prueba salió bien: el breaker se cierra.");
            state = { kind: "closed", failures: 0 };
          }
        } else if (
          state.kind === "half-open" ||
          (state.kind === "closed" && state.failures + 1 >= threshold)
        ) {
          state = { kind: "open", until: tick + openTicks };
          events.push("El breaker se abre: las llamadas fallan rápido.");
        } else if (state.kind === "closed") {
          state = { kind: "closed", failures: state.failures + 1 };
        }
      }
      calls = calls.filter((c) => c.endsAt > tick);
      if (state.kind === "open" && tick >= state.until) {
        state = { kind: "half-open", probing: false };
        events.push("Pasó el tiempo de espera: semiabierto, se permite una llamada de prueba.");
      }

      const arrivals = poisson(rng, (rate * this.tickMs) / 1000);
      let providerCalls = 0;
      let tickFallbacks = 0;
      let tickRejected = 0;
      for (let i = 0; i < arrivals; i++) {
        const allowProbe = state.kind === "half-open" && !state.probing;
        if (useBreaker && (state.kind === "open" || (state.kind === "half-open" && !allowProbe))) {
          tickFallbacks++;
          fallbacks++;
          latencies.push(1);
          continue;
        }
        if (calls.length >= workers) {
          tickRejected++;
          rejected++;
          continue;
        }
        if (state.kind === "half-open") state = { kind: "half-open", probing: true };
        providerCalls++;
        if (down) callsDuringOutage++;
        calls.push({
          start: tick,
          endsAt: tick + (down ? timeoutTicks : HEALTHY_TICKS),
          ok: !down,
          probe: allowProbe,
        });
      }
      if (tickRejected > 0 && series.rejected.every((r) => r === 0)) {
        events.push("El pool de workers se agotó: se rechazan requests aunque no dependan del proveedor.");
      }

      series.busy.push(calls.length);
      series.providerCalls.push(providerCalls);
      series.rejected.push(tickRejected);
      series.fallbacks.push(tickFallbacks);
      const stateLabel =
        state.kind === "closed" ? "Cerrado" : state.kind === "open" ? "Abierto" : "Semiabierto";
      frames.push({
        tick,
        events,
        entities: [
          {
            id: "breaker",
            label: useBreaker ? `Breaker: ${stateLabel}` : "Sin circuit breaker",
            value: state.kind === "closed" ? state.failures : threshold,
            max: threshold,
            status: !useBreaker
              ? "idle"
              : state.kind === "open"
                ? "down"
                : state.kind === "half-open"
                  ? "warning"
                  : "ok",
            detail: useBreaker
              ? state.kind === "closed"
                ? `${state.failures}/${threshold} fallas seguidas`
                : stateLabel
              : "las llamadas siempre pasan",
          },
          {
            id: "pool",
            label: "Pool de workers",
            value: calls.length,
            max: workers,
            status:
              calls.length >= workers
                ? "down"
                : calls.length > workers * 0.7
                  ? "warning"
                  : calls.length > 0
                    ? "busy"
                    : "idle",
            detail: `${calls.length}/${workers} ocupados`,
          },
          {
            id: "provider",
            label: "Proveedor externo",
            value: down ? 0 : 1,
            max: 1,
            status: down ? "down" : "ok",
            detail: down ? "no responde" : "responde en 200 ms",
          },
        ],
      });
    }

    return {
      frames,
      series,
      summary: [
        { label: "Respuestas del proveedor", value: formatNumber(ok) },
        { label: "Fallbacks", value: formatNumber(fallbacks) },
        { label: "Rechazadas por pool agotado", value: formatNumber(rejected) },
        { label: "Llamadas durante la caída", value: formatNumber(callsDuringOutage) },
        { label: "Latencia p95", value: `${formatNumber(percentile(latencies, 95))} ms` },
      ],
    };
  },
};
