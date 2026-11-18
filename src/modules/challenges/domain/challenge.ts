import type { Difficulty } from "@/modules/learning/domain/catalog-types";

export type ChallengeKind = "code" | "react" | "sql" | "design";
export type InterviewType = "live-coding" | "take-home" | "system-design" | "technical-deep-dive";

export const CHALLENGE_KIND_LABELS: Readonly<Record<ChallengeKind, string>> = {
  code: "Código",
  react: "React",
  sql: "SQL",
  design: "Diseño",
};

export const INTERVIEW_TYPE_LABELS: Readonly<Record<InterviewType, string>> = {
  "live-coding": "Live coding",
  "take-home": "Take-home",
  "system-design": "System design",
  "technical-deep-dive": "Deep dive técnico",
};

/** Criterio de una rúbrica de autoevaluación (challenges de diseño). */
export interface RubricCriterion {
  readonly id: string;
  readonly criterion: string;
  readonly description: string;
  readonly weight: number;
}

interface ChallengeBase {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly difficulty: Difficulty;
  readonly durationMinutes: number;
  readonly technologies: readonly string[];
  readonly topics: readonly string[];
  readonly skills: readonly string[];
  readonly interviewType: InterviewType;
  readonly order: number;
  readonly constraints: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  /** Pistas progresivas: de la más general a la más concreta. */
  readonly hints: readonly string[];
  readonly followUpQuestions: readonly string[];
  readonly relatedLessons: readonly string[];
  /** Enunciado en MDX (contexto, ejemplos y casos límite). */
  readonly statement: string;
  /** Explicación de la solución en MDX (enfoque, complejidad y alternativas); se muestra a pedido. */
  readonly solutionExplanation: string;
}

export interface CodeChallenge extends ChallengeBase {
  readonly kind: "code";
  readonly files: {
    readonly starter: string;
    readonly tests: string;
    readonly hiddenTests: string;
    readonly solution: string;
  };
}

/** Challenge de React: se edita y ejecuta con Sandpack (preview en vivo y tests con Jest en el navegador). */
export interface ReactChallenge extends ChallengeBase {
  readonly kind: "react";
  readonly files: {
    readonly starter: string;
    readonly tests: string;
    readonly solution: string;
  };
}

export interface SqlChallenge extends ChallengeBase {
  readonly kind: "sql";
  readonly sqlExerciseId: string;
}

export interface DesignChallenge extends ChallengeBase {
  readonly kind: "design";
  readonly rubric: readonly RubricCriterion[];
}

export type Challenge = CodeChallenge | ReactChallenge | SqlChallenge | DesignChallenge;

/** Resumen serializable para listados (sin archivos ni MDX). */
export type ChallengeSummary = Pick<
  Challenge,
  | "id"
  | "slug"
  | "title"
  | "summary"
  | "kind"
  | "difficulty"
  | "durationMinutes"
  | "technologies"
  | "topics"
  | "skills"
  | "interviewType"
>;

export interface ChallengeFilters {
  readonly kind?: ChallengeKind;
  readonly technology?: string;
  readonly difficulty?: Difficulty;
  readonly interviewType?: InterviewType;
}

/** Filtra challenges; un filtro ausente no restringe. */
export function filterChallenges<T extends ChallengeSummary>(
  challenges: readonly T[],
  filters: ChallengeFilters,
): T[] {
  return challenges.filter(
    (c) =>
      (!filters.kind || c.kind === filters.kind) &&
      (!filters.technology || c.technologies.includes(filters.technology)) &&
      (!filters.difficulty || c.difficulty === filters.difficulty) &&
      (!filters.interviewType || c.interviewType === filters.interviewType),
  );
}

/** Puntaje de una autoevaluación con rúbrica, en [0, 1]. */
export function rubricScore(rubric: readonly RubricCriterion[], checked: readonly string[]): number {
  const total = rubric.reduce((sum, c) => sum + c.weight, 0);
  if (total === 0) return 0;
  const achieved = rubric.filter((c) => checked.includes(c.id)).reduce((sum, c) => sum + c.weight, 0);
  return achieved / total;
}
