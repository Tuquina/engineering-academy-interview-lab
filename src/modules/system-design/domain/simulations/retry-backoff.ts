import {
  createRng,
  formatNumber,
  num,
  poisson,
  str,
  type SimFrame,
  type SimulationDefinition,
} from "./simulation";

const OUTAGE_START = 50; // tick (5 s)
const BASE_BACKOFF = 5; // ticks (500 ms)
const MAX_BACKOFF = 80; // ticks (8 s)
/** Requests en vuelo cuando cae el servicio, medidas en ticks de capacidad: fallan todas a la vez. */
const IN_FLIGHT_TICKS = 5;

/**
 * Reintentos ante una caída: sin reintentos, inmediatos, con backoff exponencial y con jitter. Muestra la
 * amplificación de carga y la "manada" de reintentos sincronizados cuando el servicio se recupera.
 */
export const retryBackoffSimulation: SimulationDefinition = {
  slug: "retry-backoff",
  title: "Reintentos con backoff y jitter",
  summary:
    "Un servicio cae unos segundos y los clientes reintentan. Compará reintentos inmediatos, backoff exponencial y backoff con jitter.",
  topics: ["Retries", "Backpressure", "Disponibilidad", "Thundering herd"],
  whatToObserve: [
    "Con reintentos inmediatos, ¿por qué se abandonan más requests aunque se intente más veces?",
    "Con backoff sin jitter, ¿ves olas de reintentos sincronizados que vuelven a superar la capacidad tras la recuperación?",
    "¿Cómo cambia el pico de carga posterior a la caída al agregar jitter?",
  ],
  simplifications: [
    "El servicio falla todas las requests durante la caída y, después, rechaza lo que supere su capacidad por tick. Las requests en vuelo al caer fallan todas juntas.",
    "Cada request original reintenta como máximo la cantidad configurada; el backoff empieza en 500 ms y se duplica en cada intento, con un tope de 8 s.",
    "El jitter es 'full jitter': una espera al azar entre 0 y el backoff calculado.",
  ],
  realWorld: [
    "Los reintentos sólo son seguros en operaciones idempotentes (o con clave de idempotencia).",
    "Los SDKs de nube suelen implementar backoff exponencial con jitter por defecto y respetan headers como Retry-After.",
    "Un presupuesto de reintentos (por ejemplo, no más del 10% del tráfico) y un circuit breaker evitan que los reintentos prolonguen una caída.",
  ],
  tickMs: 100,
  ticks: 300,
  parameters: [
    {
      kind: "choice",
      key: "policy",
      label: "Política",
      options: [
        { value: "none", label: "Sin reintentos" },
        { value: "immediate", label: "Inmediatos" },
        { value: "exponential", label: "Backoff exponencial" },
        { value: "jitter", label: "Backoff exponencial + jitter" },
      ],
    },
    { kind: "number", key: "maxAttempts", label: "Intentos máximos", min: 1, max: 6, step: 1 },
    { kind: "number", key: "rate", label: "Requests nuevas", min: 10, max: 100, step: 5, unit: "req/s" },
    {
      kind: "number",
      key: "capacity",
      label: "Capacidad del servicio",
      min: 30,
      max: 150,
      step: 10,
      unit: "req/s",
    },
    { kind: "number", key: "outage", label: "Duración de la caída", min: 2, max: 15, step: 1, unit: "s" },
  ],
  defaults: { policy: "exponential", maxAttempts: 5, rate: 40, capacity: 60, outage: 5 },
  metrics: [
    { key: "attempts", label: "Intentos por tick (carga)", unit: "req" },
    { key: "capacity", label: "Capacidad por tick", unit: "req" },
    { key: "success", label: "Exitosas por tick", unit: "req" },
    { key: "failed", label: "Fallidas por tick", unit: "req" },
  ],
  run(params, seed) {
    const rng = createRng(seed);
    // Fuente separada para el jitter: las llegadas son idénticas entre políticas y la comparación es justa.
    const jitterRng = createRng(seed ^ 0x9e3779b9);
    const policy = str(params, "policy");
    const maxAttempts = num(params, "maxAttempts");
    const rate = num(params, "rate");
    const capacityPerTick = (num(params, "capacity") * this.tickMs) / 1000;
    const outageEnd = OUTAGE_START + (num(params, "outage") * 1000) / this.tickMs;
    const scheduled = new Map<number, number[]>(); // tick -> intentos ya realizados de cada request
    const frames: SimFrame[] = [];
    const series = {
      attempts: [] as number[],
      capacity: [] as number[],
      success: [] as number[],
      failed: [] as number[],
    };
    let originals = 0;
    let totalAttempts = 0;
    let succeeded = 0;
    let gaveUp = 0;
    let recoveredAt: number | null = null;
    let carry = 0;
    let peakAfterRecovery = 0;

    for (let tick = 0; tick < this.ticks; tick++) {
      const events: string[] = [];
      if (tick === OUTAGE_START) events.push("El servicio cae: todas las requests fallan.");
      if (tick === outageEnd) events.push("El servicio se recupera.");
      const crashBatch = tick === OUTAGE_START ? Math.round(capacityPerTick * IN_FLIGHT_TICKS) : 0;
      if (crashBatch > 0) events.push(`${crashBatch} requests en vuelo fallan a la vez al caer el servicio.`);
      const fresh = poisson(rng, (rate * this.tickMs) / 1000) + crashBatch;
      originals += fresh;
      const attempts = [...Array<number>(fresh).fill(0), ...(scheduled.get(tick) ?? [])];
      scheduled.delete(tick);
      totalAttempts += attempts.length;

      const down = tick >= OUTAGE_START && tick < outageEnd;
      carry += capacityPerTick;
      const accepted = down ? 0 : Math.min(attempts.length, Math.floor(carry));
      carry = Math.min(carry - accepted, capacityPerTick);
      succeeded += accepted;
      let failed = 0;

      // Quienes no entraron fallan y, según la política, reprograman un reintento.
      for (const previous of attempts.slice(accepted)) {
        failed++;
        const attemptNumber = previous + 1;
        if (policy === "none" || attemptNumber >= maxAttempts) {
          gaveUp++;
          continue;
        }
        const backoff = Math.min(MAX_BACKOFF, BASE_BACKOFF * 2 ** (attemptNumber - 1));
        const wait =
          policy === "immediate"
            ? 1
            : policy === "exponential"
              ? backoff
              : 1 + Math.floor(jitterRng() * backoff);
        const at = tick + wait;
        scheduled.set(at, [...(scheduled.get(at) ?? []), attemptNumber]);
      }

      if (
        !down &&
        tick >= outageEnd &&
        recoveredAt === null &&
        failed === 0 &&
        attempts.length <= capacityPerTick
      ) {
        recoveredAt = tick;
        events.push("La carga volvió a estar por debajo de la capacidad.");
      }
      if (attempts.length > capacityPerTick * 3 && !down && tick > outageEnd && tick % 10 === 0) {
        events.push(`Pico de ${attempts.length} intentos en un tick: reintentos sincronizados.`);
      }

      if (tick >= outageEnd) peakAfterRecovery = Math.max(peakAfterRecovery, attempts.length);
      const pending = [...scheduled.values()].reduce((sum, list) => sum + list.length, 0);
      series.attempts.push(attempts.length);
      series.capacity.push(down ? 0 : Math.round(capacityPerTick));
      series.success.push(accepted);
      series.failed.push(failed);
      frames.push({
        tick,
        events,
        entities: [
          {
            id: "service",
            label: "Servicio",
            value: attempts.length,
            max: Math.max(1, capacityPerTick * 3),
            status: down ? "down" : attempts.length > capacityPerTick ? "warning" : "ok",
            detail: down
              ? "caído"
              : `${attempts.length} intentos / capacidad ${formatNumber(capacityPerTick, 1)}`,
          },
          {
            id: "retries",
            label: "Reintentos programados",
            value: pending,
            max: Math.max(20, capacityPerTick * 10),
            status: pending > capacityPerTick * 5 ? "warning" : pending > 0 ? "busy" : "idle",
            detail: `${pending} esperando`,
          },
        ],
      });
    }

    return {
      frames,
      series,
      summary: [
        { label: "Requests originales", value: formatNumber(originals) },
        { label: "Intentos totales", value: formatNumber(totalAttempts) },
        { label: "Amplificación", value: `${formatNumber(totalAttempts / Math.max(1, originals), 2)}×` },
        { label: "Exitosas", value: `${formatNumber((succeeded / Math.max(1, originals)) * 100, 1)}%` },
        { label: "Abandonadas", value: formatNumber(gaveUp) },
        {
          label: "Pico tras la recuperación",
          value: `${formatNumber(peakAfterRecovery)} intentos/tick (capacidad ${formatNumber(capacityPerTick)})`,
        },
        {
          label: "Normalidad tras la caída",
          value:
            recoveredAt === null
              ? "no se alcanzó"
              : `${formatNumber(((recoveredAt - outageEnd) * this.tickMs) / 1000, 1)} s`,
        },
      ],
    };
  },
};
