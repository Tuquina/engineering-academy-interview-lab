/**
 * Marco común de los simuladores del System Design Studio (MASTER_PROMPT §15.3).
 *
 * Cada simulador es una función pura y determinista: dados los parámetros y una semilla, produce una línea temporal
 * de cuadros (estado de cada entidad y eventos), series de métricas por tick y un resumen. No mide infraestructura
 * real: modela de forma simplificada un comportamiento para entender sus causas y efectos.
 */

export type ParameterSpec =
  | {
      readonly kind: "number";
      readonly key: string;
      readonly label: string;
      readonly min: number;
      readonly max: number;
      readonly step: number;
      readonly unit?: string;
      readonly help?: string;
    }
  | {
      readonly kind: "choice";
      readonly key: string;
      readonly label: string;
      readonly options: ReadonlyArray<{ readonly value: string; readonly label: string }>;
      readonly help?: string;
    };

export type ParameterValues = Readonly<Record<string, number | string>>;

export type EntityStatus = "idle" | "ok" | "busy" | "warning" | "down";

/** Algo que se dibuja en cada cuadro: un servidor, una cola, el estado de un breaker. */
export interface SimEntity {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  /** Máximo de referencia para dibujar la barra (capacidad, tamaño de ventana…). */
  readonly max: number;
  readonly status: EntityStatus;
  readonly detail?: string;
}

export interface SimFrame {
  readonly tick: number;
  readonly entities: readonly SimEntity[];
  /** Eventos notables ocurridos en este tick (vacío la mayoría de las veces). */
  readonly events: readonly string[];
}

export interface MetricSpec {
  readonly key: string;
  readonly label: string;
  readonly unit?: string;
}

export interface SimResult {
  readonly frames: readonly SimFrame[];
  /** Una serie por métrica, con un valor por tick. */
  readonly series: Readonly<Record<string, readonly number[]>>;
  readonly summary: ReadonlyArray<{ readonly label: string; readonly value: string }>;
}

export interface SimulationDefinition {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  /** Temas del temario de System Design que cubre. */
  readonly topics: readonly string[];
  /** Qué observar: preguntas guía para sacar conclusiones. */
  readonly whatToObserve: readonly string[];
  /** Simplificaciones explícitas del modelo. */
  readonly simplifications: readonly string[];
  /** Cómo se comporta (o se mide) esto en infraestructura real. */
  readonly realWorld: readonly string[];
  readonly tickMs: number;
  readonly ticks: number;
  readonly parameters: readonly ParameterSpec[];
  readonly defaults: ParameterValues;
  readonly metrics: readonly MetricSpec[];
  run(params: ParameterValues, seed: number): SimResult;
}

/** Generador pseudoaleatorio determinista (mulberry32): misma semilla, misma simulación. */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cantidad de llegadas en un tick con media `mean` (Poisson por el método de Knuth; adecuado para medias chicas). */
export function poisson(rng: () => number, mean: number): number {
  if (mean <= 0) return 0;
  if (mean > 30) return Math.max(0, Math.round(mean + Math.sqrt(mean) * (rng() + rng() + rng() - 1.5) * 2));
  const limit = Math.exp(-mean);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > limit);
  return k - 1;
}

export function num(params: ParameterValues, key: string): number {
  const value = params[key];
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`Parámetro numérico inválido: ${key}`);
  return value;
}

export function str(params: ParameterValues, key: string): string {
  const value = params[key];
  if (typeof value !== "string") throw new Error(`Parámetro de opción inválido: ${key}`);
  return value;
}

/** Percentil (0–100) por el método del rango más cercano. Devuelve 0 para listas vacías. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))]!;
}

/** Ajusta los parámetros a los rangos y opciones declarados (protege ante valores manipulados en la URL o storage). */
export function sanitizeParameters(
  definition: SimulationDefinition,
  values: ParameterValues,
): ParameterValues {
  const result: Record<string, number | string> = {};
  for (const spec of definition.parameters) {
    const raw = values[spec.key] ?? definition.defaults[spec.key];
    if (spec.kind === "number") {
      const n = typeof raw === "number" && Number.isFinite(raw) ? raw : Number(definition.defaults[spec.key]);
      result[spec.key] = Math.min(spec.max, Math.max(spec.min, n));
    } else {
      result[spec.key] = spec.options.some((o) => o.value === raw)
        ? (raw as string)
        : definition.defaults[spec.key]!;
    }
  }
  return result;
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("es", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
