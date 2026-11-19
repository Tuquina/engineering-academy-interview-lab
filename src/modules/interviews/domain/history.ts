import { AREA_LABELS, INTERVIEW_AREAS, type InterviewArea, type QuestionData } from "./question";
import type { InterviewMode } from "./session";

/**
 * Historial del Interview Arena: sesiones terminadas y puntos débiles (criterios no cubiertos por pregunta).
 * Sólo guarda lo que el usuario registró; no infiere evaluaciones.
 */

export const INTERVIEWS_SCHEMA_VERSION = 1;
export const MAX_SESSIONS = 60;

export interface QuestionOutcome {
  readonly questionId: string;
  readonly covered: readonly string[];
  readonly missing: readonly string[];
}

export interface SessionRecord {
  readonly id: string;
  readonly mode: InterviewMode;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly plannedMinutes: number;
  readonly elapsedSeconds: number;
  readonly questions: readonly QuestionOutcome[];
  readonly systemDesign?: {
    readonly challengeId: string;
    readonly score: number;
    readonly phasesWithNotes: number;
  };
  readonly liveCoding?: {
    readonly challengeId: string;
    readonly solved: boolean;
    readonly passed: number;
    readonly total: number;
  };
}

export interface WeakPoint {
  readonly missing: readonly string[];
  readonly lastAnsweredAt: string;
  readonly attempts: number;
}

export interface InterviewsState {
  readonly schemaVersion: typeof INTERVIEWS_SCHEMA_VERSION;
  readonly sessions: readonly SessionRecord[];
  readonly weakPoints: Readonly<Record<string, WeakPoint>>;
}

export const EMPTY_INTERVIEWS: InterviewsState = {
  schemaVersion: INTERVIEWS_SCHEMA_VERSION,
  sessions: [],
  weakPoints: {},
};

/**
 * Registra una sesión terminada. Actualiza los puntos débiles de cada pregunta respondida: los criterios faltantes
 * de la última respuesta reemplazan a los anteriores (si ahora se cubrió todo, la pregunta deja de ser débil).
 */
export function recordSession(state: InterviewsState, session: SessionRecord): InterviewsState {
  const weakPoints = { ...state.weakPoints };
  for (const outcome of session.questions) {
    const previous = weakPoints[outcome.questionId];
    if (outcome.missing.length === 0) {
      delete weakPoints[outcome.questionId];
      continue;
    }
    weakPoints[outcome.questionId] = {
      missing: [...outcome.missing],
      lastAnsweredAt: session.finishedAt,
      attempts: (previous?.attempts ?? 0) + 1,
    };
  }
  return {
    ...state,
    sessions: [session, ...state.sessions.filter((s) => s.id !== session.id)].slice(0, MAX_SESSIONS),
    weakPoints,
  };
}

export interface AreaStats {
  readonly area: InterviewArea;
  readonly label: string;
  readonly answered: number;
  /** Promedio de cobertura de criterios (0–1) en las respuestas registradas. */
  readonly averageCoverage: number;
  readonly weakQuestions: number;
}

/** Cobertura promedio por área a partir de todas las respuestas registradas. */
export function statsByArea(state: InterviewsState, bank: readonly QuestionData[]): AreaStats[] {
  const byId = new Map(bank.map((q) => [q.id, q]));
  const totals = new Map<InterviewArea, { answered: number; coverage: number }>();
  for (const session of state.sessions) {
    for (const outcome of session.questions) {
      const question = byId.get(outcome.questionId);
      if (!question) continue;
      const total = outcome.covered.length + outcome.missing.length;
      if (total === 0) continue;
      const entry = totals.get(question.area) ?? { answered: 0, coverage: 0 };
      entry.answered++;
      entry.coverage += outcome.covered.length / total;
      totals.set(question.area, entry);
    }
  }
  return INTERVIEW_AREAS.map((area) => {
    const entry = totals.get(area);
    return {
      area,
      label: AREA_LABELS[area],
      answered: entry?.answered ?? 0,
      averageCoverage: entry && entry.answered > 0 ? entry.coverage / entry.answered : 0,
      weakQuestions: bank.filter((q) => q.area === area && (state.weakPoints[q.id]?.missing.length ?? 0) > 0)
        .length,
    };
  });
}
