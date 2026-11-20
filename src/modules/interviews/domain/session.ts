import type { InterviewArea, QuestionData } from "./question";

/** Modos del Interview Arena (MASTER_PROMPT §21). */
export const INTERVIEW_MODES = [
  "quick",
  "deep-dive",
  "live-coding",
  "system-design",
  "ai-engineering",
  "behavioral",
  "mock",
  "review",
] as const;

export type InterviewMode = (typeof INTERVIEW_MODES)[number];

export interface ModeInfo {
  readonly title: string;
  readonly description: string;
  readonly defaultMinutes: number;
  readonly minMinutes: number;
  readonly maxMinutes: number;
}

export const MODE_INFO: Readonly<Record<InterviewMode, ModeInfo>> = {
  quick: {
    title: "Quick Interview",
    description: "Preguntas cortas de varias áreas para responder en uno o dos minutos cada una.",
    defaultMinutes: 8,
    minMinutes: 5,
    maxMinutes: 10,
  },
  "deep-dive": {
    title: "Technical Deep Dive",
    description: "Pocas preguntas con razonamiento y preguntas de seguimiento técnico.",
    defaultMinutes: 20,
    minMinutes: 10,
    maxMinutes: 40,
  },
  "live-coding": {
    title: "Live Coding",
    description: "Un desafío de programación con tests reales y tiempo configurable.",
    defaultMinutes: 30,
    minMinutes: 15,
    maxMinutes: 60,
  },
  "system-design": {
    title: "System Design Interview",
    description: "Un problema abierto en ocho fases, con canvas y reloj por fase.",
    defaultMinutes: 45,
    minMinutes: 25,
    maxMinutes: 60,
  },
  "ai-engineering": {
    title: "AI Engineering Interview",
    description: "Agentes, memoria, prompts, herramientas y evaluación.",
    defaultMinutes: 20,
    minMinutes: 10,
    maxMinutes: 40,
  },
  behavioral: {
    title: "Entrevista de comportamiento",
    description:
      "Preguntas de experiencia y cultura para responder con el método STAR, con criterios y una respuesta modelo.",
    defaultMinutes: 15,
    minMinutes: 10,
    maxMinutes: 30,
  },
  mock: {
    title: "Mock Interview completa",
    description: "Una sesión de 45 a 60 minutos con las secciones que elijas, una detrás de otra.",
    defaultMinutes: 55,
    minMinutes: 20,
    maxMinutes: 75,
  },
  review: {
    title: "Repaso de puntos débiles",
    description: "Las preguntas en las que te faltaron criterios, empezando por las más antiguas.",
    defaultMinutes: 15,
    minMinutes: 5,
    maxMinutes: 30,
  },
};

export type SessionStep =
  | { readonly kind: "question"; readonly questionId: string; readonly section: string }
  | {
      readonly kind: "system-design";
      readonly challengeId: string;
      readonly minutes: number;
      readonly section: string;
    }
  | {
      readonly kind: "live-coding";
      readonly challengeId: string;
      readonly minutes: number;
      readonly section: string;
    };

export interface SessionPlan {
  readonly id: string;
  readonly mode: InterviewMode;
  readonly plannedMinutes: number;
  readonly steps: readonly SessionStep[];
}

export interface MockSections {
  readonly behavioral: boolean;
  readonly quick: boolean;
  readonly deepDive: boolean;
  readonly ai: boolean;
  readonly systemDesign: boolean;
  readonly liveCoding: boolean;
}

/** Duración de cada sección de la mock interview (minutos). */
export const MOCK_SECTION_MINUTES: Readonly<Record<keyof MockSections, number>> = {
  behavioral: 10,
  quick: 8,
  deepDive: 15,
  ai: 10,
  systemDesign: 25,
  liveCoding: 20,
};

export const MOCK_SECTION_LABELS: Readonly<Record<keyof MockSections, string>> = {
  behavioral: "Comportamiento",
  quick: "Preguntas rápidas",
  deepDive: "Deep dive técnico",
  ai: "AI Engineering",
  systemDesign: "System design",
  liveCoding: "Live coding",
};

export interface SessionSources {
  readonly questions: readonly QuestionData[];
  readonly weakQuestionIds: readonly string[];
  readonly systemDesignChallengeIds: readonly string[];
  readonly codeChallengeIds: readonly string[];
}

export interface SessionOptions {
  readonly minutes: number;
  readonly areas?: readonly InterviewArea[];
  readonly challengeId?: string;
  readonly sections?: MockSections;
}

export class EmptySessionError extends Error {}

/** Mezcla de Fisher–Yates con una fuente de aleatoriedad inyectable (determinista en tests). */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function questionSteps(
  questions: readonly QuestionData[],
  count: number,
  section: string,
  random: () => number,
) {
  return shuffle(questions, random)
    .slice(0, count)
    .map((q): SessionStep => ({ kind: "question", questionId: q.id, section }));
}

function pick(ids: readonly string[], preferred: string | undefined, random: () => number): string {
  if (preferred && ids.includes(preferred)) return preferred;
  if (ids.length === 0) throw new EmptySessionError("No hay desafíos disponibles para este modo.");
  return ids[Math.floor(random() * ids.length)]!;
}

/**
 * Arma el plan de una sesión según el modo. La cantidad de preguntas se deriva del tiempo disponible
 * (≈1,5 min por pregunta rápida, ≈7 min por deep dive, ≈5 min por pregunta de AI Engineering).
 *
 * @throws {EmptySessionError} si no hay contenido suficiente para el modo elegido.
 */
export function buildSession(
  mode: InterviewMode,
  options: SessionOptions,
  sources: SessionSources,
  random: () => number,
  id: string,
): SessionPlan {
  const info = MODE_INFO[mode];
  const minutes = clamp(Math.round(options.minutes), info.minMinutes, info.maxMinutes);
  const inAreas = (q: QuestionData) => !options.areas?.length || options.areas.includes(q.area);
  // Las preguntas de AI Engineering y de comportamiento tienen su propio modo y su propia sección en la mock.
  const technical = (q: QuestionData) => q.area !== "ai-engineering" && q.area !== "behavioral";
  const quick = sources.questions.filter((q) => q.format === "quick" && technical(q) && inAreas(q));
  const deep = sources.questions.filter((q) => q.format === "deep-dive" && technical(q) && inAreas(q));
  const ai = sources.questions.filter((q) => q.area === "ai-engineering");
  const behavioral = sources.questions.filter((q) => q.area === "behavioral");
  let steps: SessionStep[] = [];
  let plannedMinutes = minutes;

  switch (mode) {
    case "quick":
      steps = questionSteps(quick, Math.max(3, Math.round(minutes / 1.5)), "Preguntas rápidas", random);
      break;
    case "deep-dive":
      steps = questionSteps(deep, Math.max(1, Math.round(minutes / 7)), "Deep dive técnico", random);
      break;
    case "ai-engineering":
      steps = questionSteps(ai, Math.max(2, Math.round(minutes / 5)), "AI Engineering", random);
      break;
    case "behavioral":
      steps = questionSteps(behavioral, Math.max(2, Math.round(minutes / 5)), "Comportamiento", random);
      break;
    case "review": {
      const weak = sources.weakQuestionIds
        .map((qid) => sources.questions.find((q) => q.id === qid))
        .filter((q) => q !== undefined);
      steps = weak
        .slice(0, Math.max(2, Math.round(minutes / 3)))
        .map((q): SessionStep => ({ kind: "question", questionId: q.id, section: "Puntos débiles" }));
      break;
    }
    case "system-design":
      steps = [
        {
          kind: "system-design",
          challengeId: pick(sources.systemDesignChallengeIds, options.challengeId, random),
          minutes,
          section: "System design",
        },
      ];
      break;
    case "live-coding":
      steps = [
        {
          kind: "live-coding",
          challengeId: pick(sources.codeChallengeIds, options.challengeId, random),
          minutes,
          section: "Live coding",
        },
      ];
      break;
    case "mock": {
      const sections = options.sections ?? {
        behavioral: false,
        quick: true,
        deepDive: true,
        ai: true,
        systemDesign: true,
        liveCoding: false,
      };
      plannedMinutes = 0;
      if (sections.behavioral) {
        steps.push(...questionSteps(behavioral, 2, MOCK_SECTION_LABELS.behavioral, random));
        plannedMinutes += MOCK_SECTION_MINUTES.behavioral;
      }
      if (sections.quick) {
        steps.push(...questionSteps(quick, 5, MOCK_SECTION_LABELS.quick, random));
        plannedMinutes += MOCK_SECTION_MINUTES.quick;
      }
      if (sections.deepDive) {
        steps.push(...questionSteps(deep, 2, MOCK_SECTION_LABELS.deepDive, random));
        plannedMinutes += MOCK_SECTION_MINUTES.deepDive;
      }
      if (sections.ai) {
        steps.push(...questionSteps(ai, 2, MOCK_SECTION_LABELS.ai, random));
        plannedMinutes += MOCK_SECTION_MINUTES.ai;
      }
      if (sections.liveCoding) {
        steps.push({
          kind: "live-coding",
          challengeId: pick(sources.codeChallengeIds, undefined, random),
          minutes: MOCK_SECTION_MINUTES.liveCoding,
          section: MOCK_SECTION_LABELS.liveCoding,
        });
        plannedMinutes += MOCK_SECTION_MINUTES.liveCoding;
      }
      if (sections.systemDesign) {
        steps.push({
          kind: "system-design",
          challengeId: pick(sources.systemDesignChallengeIds, undefined, random),
          minutes: MOCK_SECTION_MINUTES.systemDesign,
          section: MOCK_SECTION_LABELS.systemDesign,
        });
        plannedMinutes += MOCK_SECTION_MINUTES.systemDesign;
      }
      break;
    }
  }

  if (steps.length === 0) {
    throw new EmptySessionError(
      mode === "review"
        ? "Todavía no hay puntos débiles registrados: respondé preguntas en otros modos primero."
        : "No hay preguntas que coincidan con esa configuración.",
    );
  }
  return { id, mode, plannedMinutes, steps };
}
