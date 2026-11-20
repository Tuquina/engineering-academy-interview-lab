import type { Difficulty } from "@/modules/learning/domain/catalog-types";

/** Una estimación de capacidad ("back of the envelope") con el cálculo que la justifica. */
export interface CaseEstimate {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

/**
 * Caso de estudio de System Design: un problema clásico de entrevista resuelto de punta a punta, con
 * requerimientos, estimaciones, un diagrama interactivo de la arquitectura (con recorrido animado) y el desarrollo
 * en MDX (API, modelo de datos, profundizaciones y compromisos).
 */
export interface CaseStudy {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly difficulty: Difficulty;
  readonly durationMinutes: number;
  readonly order: number;
  readonly tags: readonly string[];
  /** ID de un diagrama de `content/architecture/diagrams`. */
  readonly diagram: string;
  readonly functionalRequirements: readonly string[];
  readonly nonFunctionalRequirements: readonly string[];
  readonly estimates: readonly CaseEstimate[];
  /** Preguntas con las que un entrevistador suele profundizar. */
  readonly followUps: readonly string[];
  readonly relatedPatterns: readonly string[];
  readonly relatedSimulations: readonly string[];
  /** Desarrollo en MDX. */
  readonly body: string;
}

export type CaseStudySummary = Pick<
  CaseStudy,
  "id" | "slug" | "title" | "summary" | "difficulty" | "durationMinutes" | "tags"
>;

/** Encabezados de nivel 2 que todo caso debe tener, en este orden (verificados por los tests de contenido). */
export const REQUIRED_CASE_SECTIONS = [
  "API",
  "Modelo de datos",
  "Diseño de alto nivel",
  "Profundización",
  "Compromisos",
] as const;

/** Devuelve las secciones requeridas que faltan o están fuera de orden. */
export function missingCaseSections(body: string): string[] {
  const headings = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1]!.trim());
  const missing: string[] = [];
  let cursor = 0;
  for (const section of REQUIRED_CASE_SECTIONS) {
    const index = headings.indexOf(section, cursor);
    if (index === -1) missing.push(section);
    else cursor = index + 1;
  }
  return missing;
}
