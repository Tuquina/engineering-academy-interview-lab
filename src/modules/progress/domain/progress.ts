/**
 * Modelo de progreso de estudio. Todas las operaciones son funciones puras que devuelven un estado nuevo;
 * el reloj se recibe como parámetro para que las reglas sean deterministas y fáciles de probar.
 */

export type LessonStatus = "in_progress" | "completed";

export interface LessonProgress {
  readonly status: LessonStatus;
  /** Instantes en formato ISO 8601 (UTC). */
  readonly startedAt: string;
  readonly lastVisitedAt: string;
  readonly completedAt: string | null;
}

export const PROGRESS_SCHEMA_VERSION = 1;

export interface ProgressState {
  readonly schemaVersion: typeof PROGRESS_SCHEMA_VERSION;
  /** Progreso indexado por ID estable de lección (no por slug). */
  readonly lessons: Readonly<Record<string, LessonProgress>>;
}

export const EMPTY_PROGRESS: ProgressState = Object.freeze({
  schemaVersion: PROGRESS_SCHEMA_VERSION,
  lessons: Object.freeze({}),
});

/**
 * Registra una visita a una lección. La primera visita la marca como iniciada; las siguientes sólo actualizan
 * `lastVisitedAt`. Nunca degrada una lección completada.
 */
export function recordLessonVisit(state: ProgressState, lessonId: string, now: Date): ProgressState {
  const at = now.toISOString();
  const current = state.lessons[lessonId];
  const next: LessonProgress = current
    ? { ...current, lastVisitedAt: at }
    : { status: "in_progress", startedAt: at, lastVisitedAt: at, completedAt: null };
  return withLesson(state, lessonId, next);
}

/**
 * Marca una lección como completada. Es idempotente: completar dos veces conserva la fecha de la primera.
 */
export function completeLesson(state: ProgressState, lessonId: string, now: Date): ProgressState {
  const at = now.toISOString();
  const current = state.lessons[lessonId];
  if (current?.status === "completed") return state;
  return withLesson(state, lessonId, {
    status: "completed",
    startedAt: current?.startedAt ?? at,
    lastVisitedAt: at,
    completedAt: at,
  });
}

/** Vuelve a marcar una lección completada como "en curso" (por ejemplo, para repasarla). */
export function reopenLesson(state: ProgressState, lessonId: string): ProgressState {
  const current = state.lessons[lessonId];
  if (!current || current.status !== "completed") return state;
  return withLesson(state, lessonId, { ...current, status: "in_progress", completedAt: null });
}

export interface ProgressSummary {
  readonly total: number;
  readonly completed: number;
  readonly inProgress: number;
  /** Proporción completada en [0, 1]; 0 cuando no hay lecciones. */
  readonly ratio: number;
}

/** Resume el progreso sobre un conjunto de lecciones (curso, módulo o ruta). Ignora IDs repetidos. */
export function summarizeProgress(state: ProgressState, lessonIds: readonly string[]): ProgressSummary {
  const unique = [...new Set(lessonIds)];
  let completed = 0;
  let inProgress = 0;
  for (const id of unique) {
    const status = state.lessons[id]?.status;
    if (status === "completed") completed++;
    else if (status === "in_progress") inProgress++;
  }
  return {
    total: unique.length,
    completed,
    inProgress,
    ratio: unique.length === 0 ? 0 : completed / unique.length,
  };
}

/**
 * Siguiente lección recomendada dentro de una secuencia: la primera en curso; si no hay, la primera no iniciada.
 * Prioriza terminar lo empezado antes que abrir temas nuevos.
 * @returns `null` si todas están completadas o la secuencia está vacía.
 */
export function findNextLesson(state: ProgressState, sequence: readonly string[]): string | null {
  const inProgress = sequence.find((id) => state.lessons[id]?.status === "in_progress");
  if (inProgress) return inProgress;
  return sequence.find((id) => !state.lessons[id]) ?? null;
}

/** Lecciones visitadas más recientemente, de la más nueva a la más antigua. */
export function recentLessons(
  state: ProgressState,
  limit: number,
): ReadonlyArray<{ id: string } & LessonProgress> {
  return Object.entries(state.lessons)
    .map(([id, progress]) => ({ id, ...progress }))
    .sort((a, b) => b.lastVisitedAt.localeCompare(a.lastVisitedAt))
    .slice(0, limit);
}

function withLesson(state: ProgressState, lessonId: string, progress: LessonProgress): ProgressState {
  return { ...state, lessons: { ...state.lessons, [lessonId]: progress } };
}
