import {
  createRng,
  formatNumber,
  num,
  poisson,
  str,
  type SimFrame,
  type SimulationDefinition,
} from "./simulation";

const TICKS_PER_WINDOW = 10; // ventana de 1 s con ticks de 100 ms

/**
 * Rate limiting con ventana fija, ventana deslizante (log) y token bucket, frente a tráfico constante, en
 * ráfagas o concentrado en el borde de las ventanas.
 */
export const rateLimitingSimulation: SimulationDefinition = {
  slug: "rate-limiting",
  title: "Rate limiting: ventana fija, ventana deslizante y token bucket",
  summary:
    "Un límite de N requests por segundo aplicado con tres algoritmos. Probá ráfagas y tráfico en el borde de la ventana.",
  topics: ["Rate limiting", "Multi-tenancy", "Seguridad de APIs"],
  whatToObserve: [
    "Con tráfico en el borde de la ventana, ¿cuántas requests deja pasar la ventana fija en un segundo real?",
    "¿Qué algoritmo permite ráfagas cortas y por qué eso puede ser deseable?",
    "¿Cuál necesita guardar más estado por cliente?",
  ],
  simplifications: [
    "Un único cliente y un único limitador; el límite es por segundo.",
    "La ventana deslizante guarda la marca de tiempo de cada request aceptada (sliding log).",
    "El token bucket recarga el límite por segundo de forma continua, hasta la capacidad configurada.",
  ],
  realWorld: [
    "Con varias réplicas de la API, el contador vive en un almacén compartido (Redis) y la operación debe ser atómica (script Lua o INCR + EXPIRE).",
    "La ventana deslizante suele aproximarse con dos contadores (actual y anterior) ponderados, en lugar de guardar cada marca de tiempo.",
    "La respuesta al exceder el límite es 429 con Retry-After y headers de cuota restante.",
  ],
  tickMs: 100,
  ticks: 200,
  parameters: [
    {
      kind: "choice",
      key: "algorithm",
      label: "Algoritmo",
      options: [
        { value: "fixed", label: "Ventana fija" },
        { value: "sliding", label: "Ventana deslizante" },
        { value: "bucket", label: "Token bucket" },
      ],
    },
    {
      kind: "choice",
      key: "traffic",
      label: "Tráfico",
      options: [
        { value: "boundary", label: "En el borde de la ventana" },
        { value: "bursty", label: "Ráfagas" },
        { value: "steady", label: "Constante" },
      ],
    },
    { kind: "number", key: "limit", label: "Límite", min: 5, max: 50, step: 5, unit: "req/s" },
    { kind: "number", key: "rate", label: "Tráfico constante", min: 5, max: 80, step: 5, unit: "req/s" },
    {
      kind: "number",
      key: "capacity",
      label: "Capacidad del bucket",
      min: 1,
      max: 50,
      step: 1,
      unit: "tokens",
    },
  ],
  defaults: { algorithm: "fixed", traffic: "boundary", limit: 10, rate: 20, capacity: 10 },
  metrics: [
    { key: "allowed", label: "Aceptadas por tick", unit: "req" },
    { key: "rejected", label: "Rechazadas (429) por tick", unit: "req" },
    { key: "rolling", label: "Aceptadas en el último segundo real", unit: "req" },
  ],
  run(params, seed) {
    const rng = createRng(seed);
    const algorithm = str(params, "algorithm");
    const traffic = str(params, "traffic");
    const limit = num(params, "limit");
    const rate = num(params, "rate");
    const capacity = num(params, "capacity");
    const frames: SimFrame[] = [];
    const series = { allowed: [] as number[], rejected: [] as number[], rolling: [] as number[] };
    const acceptedLog: number[] = []; // ticks de requests aceptadas (sliding log)
    const allowedPerTick: number[] = [];
    let windowIndex = -1;
    let windowCount = 0;
    let tokens = capacity;
    let totalAllowed = 0;
    let totalRejected = 0;
    let peakRolling = 0;

    for (let tick = 0; tick < this.ticks; tick++) {
      const events: string[] = [];
      let arrivals: number;
      // En el borde: cada 2 s, una ráfaga en el último tick de una ventana y otra en el primero de la siguiente.
      const cycle = tick % (TICKS_PER_WINDOW * 2);
      if (traffic === "boundary")
        arrivals = cycle === TICKS_PER_WINDOW - 1 || cycle === TICKS_PER_WINDOW ? limit : 0;
      else if (traffic === "bursty") arrivals = tick % 50 < 3 ? Math.ceil(limit * 1.5) : poisson(rng, 0.2);
      else arrivals = poisson(rng, (rate * this.tickMs) / 1000);

      tokens = Math.min(capacity, tokens + limit / TICKS_PER_WINDOW);
      if (Math.floor(tick / TICKS_PER_WINDOW) !== windowIndex) {
        windowIndex = Math.floor(tick / TICKS_PER_WINDOW);
        windowCount = 0;
      }
      while (acceptedLog.length > 0 && acceptedLog[0]! <= tick - TICKS_PER_WINDOW) acceptedLog.shift();

      let allowed = 0;
      for (let i = 0; i < arrivals; i++) {
        let ok: boolean;
        if (algorithm === "fixed") ok = windowCount < limit;
        else if (algorithm === "sliding") ok = acceptedLog.length < limit;
        else ok = tokens >= 1;
        if (!ok) continue;
        allowed++;
        windowCount++;
        acceptedLog.push(tick);
        tokens -= 1;
      }
      const rejected = arrivals - allowed;
      totalAllowed += allowed;
      totalRejected += rejected;
      allowedPerTick.push(allowed);
      const rolling = allowedPerTick.slice(-TICKS_PER_WINDOW).reduce((a, b) => a + b, 0);
      if (rolling > limit && rolling > peakRolling) {
        events.push(`En el último segundo real pasaron ${rolling} requests con un límite de ${limit}.`);
      }
      peakRolling = Math.max(peakRolling, rolling);
      series.allowed.push(allowed);
      series.rejected.push(rejected);
      series.rolling.push(rolling);

      const state =
        algorithm === "fixed"
          ? {
              label: "Contador de la ventana",
              value: windowCount,
              max: limit,
              detail: `${windowCount}/${limit} en la ventana actual`,
            }
          : algorithm === "sliding"
            ? {
                label: "Requests en la ventana deslizante",
                value: acceptedLog.length,
                max: limit,
                detail: `${acceptedLog.length}/${limit} en el último segundo`,
              }
            : {
                label: "Tokens disponibles",
                value: Math.floor(tokens),
                max: capacity,
                detail: `${formatNumber(tokens, 1)}/${capacity} tokens`,
              };
      frames.push({
        tick,
        events,
        entities: [
          { id: "limiter", ...state, status: state.value >= state.max ? "warning" : "ok" },
          {
            id: "rolling",
            label: "Aceptadas en el último segundo real",
            value: rolling,
            max: limit * 2,
            status: rolling > limit ? "down" : rolling === limit ? "warning" : "ok",
            detail: `${rolling} (límite ${limit})`,
          },
        ],
      });
    }

    return {
      frames,
      series,
      summary: [
        { label: "Aceptadas", value: formatNumber(totalAllowed) },
        { label: "Rechazadas (429)", value: formatNumber(totalRejected) },
        { label: "Máximo en 1 s real", value: `${formatNumber(peakRolling)} (límite ${limit})` },
      ],
    };
  },
};
