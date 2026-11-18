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
  /** Última sección leída (ID de encabezado), para retomar la lectura. */
  readonly lastSectionId: string | null;
}

/** Historial agregado de una pregunta de evaluación (knowledge check). */
export interface QuestionRecord {
  readonly lessonId: string;
  readonly attempts: number;
  readonly correctAttempts: number;
  readonly lastAnsweredAt: string;
  readonly lastCorrect: boolean;
}

export const PROGRESS_SCHEMA_VERSION = 2;

export interface ProgressState {
  readonly schemaVersion: typeof PROGRESS_SCHEMA_VERSION;
  /** Progreso indexado por ID estable de lección (no por slug). */
  readonly lessons: Readonly<Record<string, LessonProgress>>;
  /** Respuestas indexadas por ID estable de pregunta. */
  readonly questions: Readonly<Record<string, QuestionRecord>>;
  /** Segundos de estudio activo por día local (`YYYY-MM-DD`). */
  readonly studySeconds: Readonly<Record<string, number>>;
}

export const EMPTY_PROGRESS: ProgressState = Object.freeze({
  schemaVersion: PROGRESS_SCHEMA_VERSION,
  lessons: Object.freeze({}),
  questions: Object.freeze({}),
  studySeconds: Object.freeze({}),
});

/** Máximo de segundos que se acepta registrar en una sola llamada (protege contra relojes o timers erróneos). */
export const MAX_STUDY_INCREMENT_SECONDS = 120;

/**
 * Registra una visita a una lección. La primera visita la marca como iniciada; las siguientes sólo actualizan
 * `lastVisitedAt`. Nunca degrada una lección completada.
 */
export function recordLessonVisit(state: ProgressState, lessonId: string, now: Date): ProgressState {
  const at = now.toISOString();
  const current = state.lessons[lessonId];
  const next: LessonProgress = current
    ? { ...current, lastVisitedAt: at }
    : { status: "in_progress", startedAt: at, lastVisitedAt: at, completedAt: null, lastSectionId: null };
  return withLesson(state, lessonId, next);
}

/** Guarda la última sección leída de una lección ya visitada. Es un no-op si no cambia. */
export function recordReadingPosition(
  state: ProgressState,
  lessonId: string,
  sectionId: string,
): ProgressState {
  const current = state.lessons[lessonId];
  if (!current || current.lastSectionId === sectionId) return state;
  return withLesson(state, lessonId, { ...current, lastSectionId: sectionId });
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
    lastSectionId: current?.lastSectionId ?? null,
  });
}

/** Vuelve a marcar una lección completada como "en curso" (por ejemplo, para repasarla). */
export function reopenLesson(state: ProgressState, lessonId: string): ProgressState {
  const current = state.lessons[lessonId];
  if (!current || current.status !== "completed") return state;
  return withLesson(state, lessonId, { ...current, status: "in_progress", completedAt: null });
}

/** Registra una respuesta a una pregunta de evaluación. */
export function recordAnswer(
  state: ProgressState,
  answer: { questionId: string; lessonId: string; correct: boolean },
  now: Date,
): ProgressState {
  const previous = state.questions[answer.questionId];
  const record: QuestionRecord = {
    lessonId: answer.lessonId,
    attempts: (previous?.attempts ?? 0) + 1,
    correctAttempts: (previous?.correctAttempts ?? 0) + (answer.correct ? 1 : 0),
    lastAnsweredAt: now.toISOString(),
    lastCorrect: answer.correct,
  };
  return { ...state, questions: { ...state.questions, [answer.questionId]: record } };
}

/**
 * Suma tiempo de estudio activo a un día. Ignora valores no positivos y acota cada incremento a
 * {@link MAX_STUDY_INCREMENT_SECONDS} para que un timer defectuoso no infle las métricas.
 */
export function addStudyTime(state: ProgressState, dayKey: string, seconds: number): ProgressState {
  if (!Number.isFinite(seconds) || seconds <= 0) return state;
  const increment = Math.min(Math.round(seconds), MAX_STUDY_INCREMENT_SECONDS);
  const total = (state.studySeconds[dayKey] ?? 0) + increment;
  return { ...state, studySeconds: { ...state.studySeconds, [dayKey]: total } };
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

export interface QuizSummary {
  readonly answered: number;
  readonly firstTryCorrect: number;
  /** Preguntas cuya última respuesta fue incorrecta: señal de debilidad vigente. */
  readonly currentlyWrong: readonly string[];
  /** Proporción de preguntas acertadas en la última respuesta, en [0, 1]. */
  readonly accuracy: number;
}

export function summarizeQuiz(state: ProgressState): QuizSummary {
  const entries = Object.entries(state.questions);
  const currentlyWrong = entries.filter(([, q]) => !q.lastCorrect).map(([id]) => id);
  const firstTryCorrect = entries.filter(([, q]) => q.attempts === 1 && q.lastCorrect).length;
  return {
    answered: entries.length,
    firstTryCorrect,
    currentlyWrong,
    accuracy: entries.length === 0 ? 0 : (entries.length - currentlyWrong.length) / entries.length,
  };
}

function withLesson(state: ProgressState, lessonId: string, progress: LessonProgress): ProgressState {
  return { ...state, lessons: { ...state.lessons, [lessonId]: progress } };
}
