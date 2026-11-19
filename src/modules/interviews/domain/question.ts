/**
 * Banco de preguntas de entrevista (MASTER_PROMPT §21). Cada pregunta trae los criterios que una buena respuesta
 * debería cubrir, una respuesta sólida de referencia, errores frecuentes y preguntas de seguimiento. La evaluación
 * es una autoevaluación contra esos criterios: no hay evaluación semántica automática.
 */

export const INTERVIEW_AREAS = [
  "typescript",
  "nodejs",
  "react",
  "nextjs",
  "architecture",
  "system-design",
  "databases",
  "ai-engineering",
] as const;

export type InterviewArea = (typeof INTERVIEW_AREAS)[number];

export const AREA_LABELS: Readonly<Record<InterviewArea, string>> = {
  typescript: "TypeScript",
  nodejs: "Node.js",
  react: "React",
  nextjs: "Next.js",
  architecture: "Arquitectura",
  "system-design": "System Design",
  databases: "Bases de datos",
  "ai-engineering": "AI Engineering",
};

/** `quick`: respuesta corta (1–3 min). `deep-dive`: razonamiento y seguimiento técnico. */
export type QuestionFormat = "quick" | "deep-dive";

export interface ExpectedPoint {
  readonly id: string;
  readonly point: string;
}

export interface InterviewQuestion {
  readonly id: string;
  readonly slug: string;
  readonly area: InterviewArea;
  readonly format: QuestionFormat;
  readonly question: string;
  readonly expectedPoints: readonly ExpectedPoint[];
  readonly followUps: readonly string[];
  readonly commonMistakes: readonly string[];
  readonly relatedLessons: readonly string[];
  readonly relatedPatterns: readonly string[];
  /** Respuesta sólida de referencia (Markdown/MDX). */
  readonly strongAnswer: string;
}

/** Datos de una pregunta que viajan al cliente (la respuesta sólida va ya renderizada aparte). */
export type QuestionData = Omit<InterviewQuestion, "strongAnswer">;

/** Cobertura de una respuesta según los criterios que el usuario marcó como cubiertos. */
export function coverage(question: Pick<InterviewQuestion, "expectedPoints">, covered: readonly string[]) {
  const ids = new Set(question.expectedPoints.map((p) => p.id));
  const coveredValid = [...new Set(covered)].filter((id) => ids.has(id));
  const missing = question.expectedPoints.filter((p) => !coveredValid.includes(p.id)).map((p) => p.id);
  return {
    covered: coveredValid,
    missing,
    ratio: question.expectedPoints.length === 0 ? 0 : coveredValid.length / question.expectedPoints.length,
  };
}
