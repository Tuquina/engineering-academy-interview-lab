import type { RubricCriterion } from "@/modules/challenges/domain/challenge";
import type { Difficulty } from "@/modules/learning/domain/catalog-types";

/**
 * Fases de una entrevista de System Design (MASTER_PROMPT §21). Son también las secciones del espacio de diseño
 * de cada challenge de arquitectura (§15.4), de modo que practicar un challenge y simular la entrevista usan la
 * misma estructura.
 */
export const SYSTEM_DESIGN_PHASES = [
  {
    id: "requirements",
    title: "Aclarar requerimientos",
    minutes: 5,
    prompt:
      "¿Qué tiene que hacer el sistema y qué no? Escribí los requerimientos funcionales que vas a cubrir y las preguntas que le harías al entrevistador, con los supuestos que tomás si no hay respuesta.",
  },
  {
    id: "constraints",
    title: "Identificar restricciones",
    minutes: 5,
    prompt:
      "Volumen, picos, latencia esperada, disponibilidad, consistencia, regulación, costos. Hacé una estimación de carga de orden de magnitud (eventos por segundo, almacenamiento por año).",
  },
  {
    id: "data-model",
    title: "Diseñar el modelo de datos",
    minutes: 6,
    prompt:
      "Entidades principales, claves, restricciones de unicidad que protegen invariantes, índices para las consultas críticas y cómo se particiona o se aísla por tenant.",
  },
  {
    id: "components",
    title: "Diseñar los componentes",
    minutes: 8,
    prompt:
      "Dibujá los componentes en el canvas y explicá la responsabilidad de cada uno. Empezá simple y agregá piezas sólo cuando un requerimiento lo justifique.",
  },
  {
    id: "flows",
    title: "Explicar los flujos",
    minutes: 6,
    prompt:
      "Recorré los flujos principales paso a paso: qué es síncrono, qué es asíncrono, dónde están las transacciones y qué se devuelve al cliente.",
  },
  {
    id: "scalability",
    title: "Evaluar la escalabilidad",
    minutes: 5,
    prompt:
      "¿Qué pieza se satura primero si el volumen se multiplica por 10? ¿Cómo escala cada componente (réplicas, particiones, colas, caché)?",
  },
  {
    id: "failures",
    title: "Analizar fallos",
    minutes: 6,
    prompt:
      "¿Qué pasa si cae cada dependencia? Duplicados, reintentos, timeouts, mensajes perdidos, datos inconsistentes. ¿Cómo se detecta y cómo se recupera?",
  },
  {
    id: "decisions",
    title: "Justificar decisiones",
    minutes: 4,
    prompt:
      "Las dos o tres decisiones más importantes, las alternativas que descartaste y por qué. Qué harías distinto con más tiempo, más equipo o más escala.",
  },
] as const;

export type SystemDesignPhaseId = (typeof SYSTEM_DESIGN_PHASES)[number]["id"];

export interface ClarifyingQuestion {
  readonly question: string;
  /** Por qué importa la respuesta para el diseño. */
  readonly why: string;
}

export interface ArchitectureChallenge {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly difficulty: Difficulty;
  readonly durationMinutes: number;
  readonly order: number;
  readonly topics: readonly string[];
  readonly functionalRequirements: readonly string[];
  readonly nonFunctionalRequirements: readonly string[];
  /** Datos de escala para estimar (volúmenes, picos). */
  readonly scale: readonly string[];
  readonly clarifyingQuestions: readonly ClarifyingQuestion[];
  readonly checklist: readonly string[];
  readonly rubric: readonly RubricCriterion[];
  readonly relatedPatterns: readonly string[];
  readonly relatedSimulations: readonly string[];
  /** Escenario en MDX. */
  readonly context: string;
  /** Diseño de referencia en MDX. */
  readonly solution: string;
}

export type ArchitectureChallengeSummary = Pick<
  ArchitectureChallenge,
  "id" | "slug" | "title" | "summary" | "difficulty" | "durationMinutes" | "topics"
>;

/** Fases con notas escritas (no vacías). */
export function completedPhases(notes: Readonly<Record<string, string>>): SystemDesignPhaseId[] {
  return SYSTEM_DESIGN_PHASES.filter((p) => (notes[p.id] ?? "").trim().length > 0).map((p) => p.id);
}

/**
 * Reparte un tiempo total entre las fases, proporcional a su duración sugerida (mínimo 1 minuto por fase).
 */
export function phaseBudgets(totalMinutes: number): Record<SystemDesignPhaseId, number> {
  const suggested = SYSTEM_DESIGN_PHASES.reduce((sum, p) => sum + p.minutes, 0);
  return Object.fromEntries(
    SYSTEM_DESIGN_PHASES.map((p) => [p.id, Math.max(1, Math.round((p.minutes / suggested) * totalMinutes))]),
  ) as Record<SystemDesignPhaseId, number>;
}
