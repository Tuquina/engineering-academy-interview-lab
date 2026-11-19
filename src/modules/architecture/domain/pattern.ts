import type { Difficulty } from "@/modules/learning/domain/catalog-types";

/** Familia del patrón: de diseño (GoF y afines) o de arquitectura/integración. */
export type PatternKind = "design" | "architecture";

export type PatternCategory =
  | "creational"
  | "structural"
  | "behavioral"
  | "data-access"
  | "application-architecture"
  | "distributed-data"
  | "resilience"
  | "integration";

export const PATTERN_KIND_LABELS: Readonly<Record<PatternKind, string>> = {
  design: "Patrón de diseño",
  architecture: "Patrón de arquitectura",
};

export const PATTERN_CATEGORY_LABELS: Readonly<Record<PatternCategory, string>> = {
  creational: "Creacional",
  structural: "Estructural",
  behavioral: "Comportamiento",
  "data-access": "Acceso a datos",
  "application-architecture": "Arquitectura de aplicación",
  "distributed-data": "Datos distribuidos",
  resilience: "Resiliencia",
  integration: "Integración",
};

export interface InterviewQuestion {
  readonly question: string;
  readonly answer: string;
}

export interface PatternAlternative {
  readonly name: string;
  readonly when: string;
}

/**
 * Patrón de la biblioteca (MASTER_PROMPT §14). Los campos de listas viven en el frontmatter; la motivación, el
 * ejemplo incorrecto, la implementación correcta y el ejercicio viven en el cuerpo MDX con encabezados fijos
 * ({@link REQUIRED_PATTERN_SECTIONS}), verificados por los tests de contenido.
 */
export interface Pattern {
  readonly id: string;
  readonly slug: string;
  readonly kind: PatternKind;
  readonly category: PatternCategory;
  readonly title: string;
  readonly summary: string;
  readonly difficulty: Difficulty;
  readonly order: number;
  readonly definition: string;
  readonly problem: string;
  readonly benefits: readonly string[];
  readonly costs: readonly string[];
  readonly alternatives: readonly PatternAlternative[];
  readonly commonMistakes: readonly string[];
  readonly avoidWhen: readonly string[];
  readonly interviewQuestions: readonly InterviewQuestion[];
  /** Diagramas interactivos (IDs de `content/architecture/diagrams`). */
  readonly diagrams: readonly string[];
  /** Slugs de otros patrones relacionados. */
  readonly related: readonly string[];
  readonly relatedLessons: readonly string[];
  readonly tags: readonly string[];
  /** Cuerpo MDX con las secciones requeridas. */
  readonly body: string;
}

/** Encabezados de nivel 2 que todo patrón debe tener en su cuerpo, en este orden. */
export const REQUIRED_PATTERN_SECTIONS = [
  "Motivación",
  "Ejemplo incorrecto",
  "Implementación correcta",
  "Ejercicio",
] as const;

export type PatternSummary = Pick<
  Pattern,
  "id" | "slug" | "kind" | "category" | "title" | "summary" | "difficulty" | "tags"
>;

export interface PatternFilters {
  readonly kind?: PatternKind;
  readonly category?: PatternCategory;
  readonly query?: string;
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Filtra la biblioteca por familia, categoría y texto (título, resumen o etiquetas). */
export function filterPatterns<T extends PatternSummary>(
  patterns: readonly T[],
  filters: PatternFilters,
): T[] {
  const query = filters.query ? normalize(filters.query.trim()) : "";
  return patterns.filter(
    (p) =>
      (!filters.kind || p.kind === filters.kind) &&
      (!filters.category || p.category === filters.category) &&
      (!query || normalize([p.title, p.summary, ...p.tags].join(" ")).includes(query)),
  );
}

/** Devuelve los encabezados requeridos que faltan o están fuera de orden en el cuerpo MDX de un patrón. */
export function missingPatternSections(body: string): string[] {
  const headings = [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);
  const missing: string[] = [];
  let cursor = -1;
  for (const section of REQUIRED_PATTERN_SECTIONS) {
    const index = headings.indexOf(section);
    if (index === -1 || index < cursor) missing.push(section);
    else cursor = index;
  }
  return missing;
}
