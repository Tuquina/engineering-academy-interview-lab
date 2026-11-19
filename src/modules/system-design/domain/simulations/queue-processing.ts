import {
  createRng,
  formatNumber,
  num,
  poisson,
  str,
  type SimEntity,
  type SimFrame,
  type SimulationDefinition,
} from "./simulation";

const BURST_START = 100;
const BURST_END = 130;
const REDELIVERY_DELAY = 10; // ticks hasta que vence la visibilidad y el mensaje vuelve a la cola

interface Message {
  id: number;
  key: number;
  seq: number;
}

interface Consumer {
  current: { message: Message; endsAt: number } | null;
  partition: Message[];
}

/**
 * Procesamiento de una cola con entrega al menos una vez: acumulación ante picos, mensajes duplicados por
 * reentregas, y mensajes de la misma entidad procesados fuera de orden por consumidores en paralelo.
 */
export const queueProcessingSimulation: SimulationDefinition = {
  slug: "queue-processing",
  title: "Colas: duplicados, desorden y acumulación",
  summary:
    "Un productor con un pico, varios consumidores y entrega al menos una vez. Activá idempotencia y particionado por clave para ver qué resuelve cada uno.",
  topics: [
    "Mensajería",
    "Procesamiento de colas",
    "Mensajes duplicados",
    "Mensajes fuera de orden",
    "Idempotencia",
  ],
  whatToObserve: [
    "Sin idempotencia, ¿cuántos efectos duplicados producen las reentregas?",
    "Con varios consumidores sobre una sola cola, ¿por qué se aplican eventos viejos después de eventos nuevos de la misma entidad?",
    "¿Cuánto tarda en vaciarse la cola después del pico con 2 consumidores y con 6?",
  ],
  simplifications: [
    "Un consumidor puede caerse después de aplicar el efecto y antes de confirmar: el mensaje se reentrega 1 s después.",
    "El tiempo de procesamiento varía ±50% alrededor del valor configurado.",
    "Con particionado, cada clave va siempre al mismo consumidor (como las particiones de Kafka).",
  ],
  realWorld: [
    "SQS, RabbitMQ y Kafka entregan al menos una vez en su configuración habitual; la idempotencia es del consumidor.",
    "El orden se garantiza sólo dentro de una partición o grupo de mensajes; entre particiones no hay orden.",
    "Las métricas clave son la profundidad de la cola, la antigüedad del mensaje más viejo y los mensajes en la DLQ.",
  ],
  tickMs: 100,
  ticks: 300,
  parameters: [
    {
      kind: "choice",
      key: "idempotency",
      label: "Consumidor idempotente",
      options: [
        { value: "off", label: "No" },
        { value: "on", label: "Sí (registra IDs procesados)" },
      ],
    },
    {
      kind: "choice",
      key: "ordering",
      label: "Distribución",
      options: [
        { value: "shared", label: "Una cola compartida" },
        { value: "partitioned", label: "Particionado por clave" },
      ],
    },
    { kind: "number", key: "consumers", label: "Consumidores", min: 1, max: 8, step: 1 },
    { kind: "number", key: "rate", label: "Mensajes", min: 5, max: 60, step: 5, unit: "msg/s" },
    {
      kind: "number",
      key: "processingMs",
      label: "Procesamiento",
      min: 100,
      max: 1000,
      step: 100,
      unit: "ms",
    },
    { kind: "number", key: "crash", label: "Caídas antes de confirmar", min: 0, max: 20, step: 1, unit: "%" },
  ],
  defaults: { idempotency: "off", ordering: "shared", consumers: 4, rate: 20, processingMs: 300, crash: 5 },
  metrics: [
    { key: "depth", label: "Profundidad de la cola", unit: "msg" },
    { key: "duplicates", label: "Efectos duplicados (acumulado)", unit: "msg" },
    { key: "outOfOrder", label: "Aplicados fuera de orden (acumulado)", unit: "msg" },
  ],
  run(params, seed) {
    const rng = createRng(seed);
    const idempotent = str(params, "idempotency") === "on";
    const partitioned = str(params, "ordering") === "partitioned";
    const consumerCount = num(params, "consumers");
    const rate = num(params, "rate");
    const processingTicks = num(params, "processingMs") / this.tickMs;
    const crashProbability = num(params, "crash") / 100;
    const keys = 12;

    const shared: Message[] = [];
    const consumers: Consumer[] = Array.from({ length: consumerCount }, () => ({
      current: null,
      partition: [],
    }));
    const redeliveries: Array<{ at: number; message: Message }> = [];
    const applied = new Set<number>();
    const lastSeq = new Map<number, number>();
    const nextSeq = new Map<number, number>();
    const frames: SimFrame[] = [];
    const series = { depth: [] as number[], duplicates: [] as number[], outOfOrder: [] as number[] };
    let nextId = 1;
    let produced = 0;
    let processed = 0;
    let duplicates = 0;
    let prevented = 0;
    let outOfOrder = 0;
    let maxDepth = 0;
    let drainedAt: number | null = null;

    const enqueue = (message: Message) => {
      if (partitioned) consumers[message.key % consumerCount]!.partition.push(message);
      else shared.push(message);
    };
    const depth = () => shared.length + consumers.reduce((sum, c) => sum + c.partition.length, 0);

    for (let tick = 0; tick < this.ticks; tick++) {
      const events: string[] = [];
      if (tick === BURST_START)
        events.push("Pico de tráfico: el productor envía 4 veces más mensajes durante 3 s.");
      const burst = tick >= BURST_START && tick < BURST_END;
      const arrivals = poisson(rng, ((burst ? rate * 4 : rate) * this.tickMs) / 1000);
      for (let i = 0; i < arrivals; i++) {
        const key = Math.floor(rng() * keys);
        const seq = (nextSeq.get(key) ?? 0) + 1;
        nextSeq.set(key, seq);
        enqueue({ id: nextId++, key, seq });
        produced++;
      }
      for (let i = redeliveries.length - 1; i >= 0; i--) {
        if (redeliveries[i]!.at <= tick) {
          enqueue(redeliveries[i]!.message);
          redeliveries.splice(i, 1);
        }
      }

      consumers.forEach((consumer, index) => {
        if (consumer.current && consumer.current.endsAt <= tick) {
          const { message } = consumer.current;
          consumer.current = null;
          if (idempotent && applied.has(message.id)) {
            prevented++;
          } else {
            if (applied.has(message.id)) {
              duplicates++;
              if (duplicates === 1) events.push(`El mensaje ${message.id} se aplicó dos veces (reentrega).`);
            }
            applied.add(message.id);
            const last = lastSeq.get(message.key) ?? 0;
            if (message.seq < last) {
              outOfOrder++;
              if (outOfOrder === 1) {
                events.push(
                  `Entidad ${message.key}: se aplicó la versión ${message.seq} después de la ${last}.`,
                );
              }
            } else lastSeq.set(message.key, message.seq);
          }
          processed++;
          if (rng() < crashProbability) {
            redeliveries.push({ at: tick + REDELIVERY_DELAY, message });
            events.push(
              `El consumidor ${index + 1} se cayó antes de confirmar: el mensaje ${message.id} se reentregará.`,
            );
          }
        }
        if (!consumer.current) {
          const source = partitioned ? consumer.partition : shared;
          const message = source.shift();
          if (message) {
            const duration = Math.max(1, Math.round(processingTicks * (0.5 + rng())));
            consumer.current = { message, endsAt: tick + duration };
          }
        }
      });

      const currentDepth = depth();
      maxDepth = Math.max(maxDepth, currentDepth);
      if (tick > BURST_END && drainedAt === null && currentDepth <= consumerCount) {
        drainedAt = tick;
        events.push("La cola volvió a su nivel normal.");
      }
      series.depth.push(currentDepth);
      series.duplicates.push(duplicates);
      series.outOfOrder.push(outOfOrder);

      const entities: SimEntity[] = [
        {
          id: "queue",
          label: partitioned ? "Particiones (total)" : "Cola",
          value: currentDepth,
          max: Math.max(50, maxDepth),
          status:
            currentDepth > 100 ? "down" : currentDepth > 20 ? "warning" : currentDepth > 0 ? "busy" : "idle",
          detail: `${currentDepth} mensajes esperando`,
        },
        ...consumers.map((consumer, index): SimEntity => ({
          id: `consumer-${index + 1}`,
          label: `Consumidor ${index + 1}`,
          value: consumer.current ? 1 : 0,
          max: 1,
          status: consumer.current ? "busy" : "idle",
          detail: consumer.current
            ? `procesa #${consumer.current.message.id} (entidad ${consumer.current.message.key} v${consumer.current.message.seq})${partitioned ? ` · partición ${consumer.partition.length}` : ""}`
            : "libre",
        })),
      ];
      frames.push({ tick, events, entities });
    }

    return {
      frames,
      series,
      summary: [
        { label: "Producidos", value: formatNumber(produced) },
        { label: "Procesados (incluye reentregas)", value: formatNumber(processed) },
        { label: "Profundidad máxima", value: formatNumber(maxDepth) },
        { label: "Duplicados evitados", value: formatNumber(prevented) },
        { label: "Efectos duplicados", value: formatNumber(duplicates) },
        { label: "Aplicados fuera de orden", value: formatNumber(outOfOrder) },
        {
          label: "Vaciado tras el pico",
          value:
            drainedAt === null
              ? "no se alcanzó"
              : `${formatNumber(((drainedAt - BURST_END) * this.tickMs) / 1000, 1)} s`,
        },
      ],
    };
  },
};
