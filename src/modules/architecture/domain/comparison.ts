/**
 * Comparador de arquitecturas (MASTER_PROMPT §14.5). Cada arquitectura tiene, por dimensión, una valoración
 * **cualitativa y relativa** entre las arquitecturas del comparador, y una explicación del compromiso. No hay
 * valores numéricos universales: la valoración resume la tendencia típica y la explicación dice de qué depende.
 */

export const COMPARISON_DIMENSIONS = [
  "complexity",
  "scalability",
  "maintainability",
  "latency",
  "consistency",
  "operationalCost",
  "deployability",
  "testing",
  "observability",
  "coupling",
] as const;

export type ComparisonDimension = (typeof COMPARISON_DIMENSIONS)[number];

export const DIMENSION_LABELS: Readonly<Record<ComparisonDimension, string>> = {
  complexity: "Complejidad",
  scalability: "Escalabilidad",
  maintainability: "Mantenibilidad",
  latency: "Latencia",
  consistency: "Consistencia",
  operationalCost: "Costos operativos",
  deployability: "Facilidad de despliegue",
  testing: "Testing",
  observability: "Observabilidad",
  coupling: "Acoplamiento",
};

/**
 * Valoración relativa. Su significado depende de la dimensión: en "Complejidad" o "Costos operativos" `high` es
 * peor; en "Escalabilidad" es mejor. Por eso la interfaz muestra la palabra, no un color de "bueno/malo".
 */
export type RelativeLevel = "low" | "medium" | "high";

export const LEVEL_LABELS: Readonly<Record<RelativeLevel, string>> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export interface DimensionAssessment {
  readonly level: RelativeLevel;
  readonly explanation: string;
}

export interface ArchitectureProfile {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  /** Contexto en el que suele ser una buena elección. */
  readonly fitsWhen: readonly string[];
  readonly assessments: Readonly<Record<ComparisonDimension, DimensionAssessment>>;
  /** Slug del patrón relacionado en la biblioteca, si existe. */
  readonly patternSlug?: string;
}

export interface ComparisonRow {
  readonly dimension: ComparisonDimension;
  readonly label: string;
  readonly left: DimensionAssessment;
  readonly right: DimensionAssessment;
  /** `true` cuando la valoración relativa difiere: es donde está el compromiso. */
  readonly differs: boolean;
}

/** Arma la comparación dimensión por dimensión entre dos arquitecturas. */
export function compareArchitectures(left: ArchitectureProfile, right: ArchitectureProfile): ComparisonRow[] {
  return COMPARISON_DIMENSIONS.map((dimension) => ({
    dimension,
    label: DIMENSION_LABELS[dimension],
    left: left.assessments[dimension],
    right: right.assessments[dimension],
    differs: left.assessments[dimension].level !== right.assessments[dimension].level,
  }));
}
