/**
 * Registro de práctica: intentos de challenges de código y SQL, borradores y autoevaluaciones de diseño.
 * Funciones puras sobre estado inmutable; el reloj se recibe como parámetro.
 */

export const PRACTICE_SCHEMA_VERSION = 1;

/** Tamaño máximo de un borrador guardado (protege la cuota de almacenamiento local). */
export const MAX_DRAFT_LENGTH = 50_000;

export interface AttemptRecord {
  readonly attempts: number;
  readonly lastRunAt: string;
  /** Primera vez que todos los tests pasaron (o la consulta fue correcta). */
  readonly solvedAt: string | null;
  /** Mejor resultado: tests aprobados sobre el total, en la mejor ejecución. */
  readonly bestPassed: number;
  readonly total: number;
}

export interface DesignAnswer {
  readonly answer: string;
  readonly checkedCriteria: readonly string[];
  readonly updatedAt: string;
}

export interface PracticeState {
  readonly schemaVersion: typeof PRACTICE_SCHEMA_VERSION;
  /** Intentos por ID de ejercicio (challenge de código o ejercicio SQL). */
  readonly attempts: Readonly<Record<string, AttemptRecord>>;
  /** Último código o consulta escrita por ID de ejercicio. */
  readonly drafts: Readonly<Record<string, string>>;
  readonly design: Readonly<Record<string, DesignAnswer>>;
  /** IDs de ejercicios cuya solución de referencia se reveló antes de resolverlos (transparencia, no castigo). */
  readonly solutionsRevealed: readonly string[];
}

export const EMPTY_PRACTICE: PracticeState = Object.freeze({
  schemaVersion: PRACTICE_SCHEMA_VERSION,
  attempts: Object.freeze({}),
  drafts: Object.freeze({}),
  design: Object.freeze({}),
  solutionsRevealed: Object.freeze([]),
});

/**
 * Registra una ejecución evaluada. Un ejercicio queda resuelto la primera vez que `passed === total` con `total > 0`;
 * resolverlo no se "pierde" con intentos posteriores peores.
 */
export function recordAttempt(
  state: PracticeState,
  exerciseId: string,
  outcome: { passed: number; total: number; solved?: boolean },
  now: Date,
): PracticeState {
  const at = now.toISOString();
  const previous = state.attempts[exerciseId];
  // `solved` permite exigir condiciones extra (p. ej. sin errores de tipos); por defecto, todos los tests aprobados.
  const solvedNow = outcome.solved ?? (outcome.total > 0 && outcome.passed === outcome.total);
  const record: AttemptRecord = {
    attempts: (previous?.attempts ?? 0) + 1,
    lastRunAt: at,
    solvedAt: previous?.solvedAt ?? (solvedNow ? at : null),
    bestPassed: Math.max(previous?.bestPassed ?? 0, outcome.passed),
    total: outcome.total,
  };
  return { ...state, attempts: { ...state.attempts, [exerciseId]: record } };
}

/** Guarda el borrador (recortado al máximo permitido). Un borrador vacío lo elimina. */
export function saveDraft(state: PracticeState, exerciseId: string, code: string): PracticeState {
  const value = code.slice(0, MAX_DRAFT_LENGTH);
  if (state.drafts[exerciseId] === value) return state;
  if (value === "") {
    const { [exerciseId]: _removed, ...rest } = state.drafts;
    return { ...state, drafts: rest };
  }
  return { ...state, drafts: { ...state.drafts, [exerciseId]: value } };
}

/**
 * Actualiza la respuesta de un challenge de diseño. Es un *patch*: los campos ausentes conservan su valor actual,
 * así el guardado diferido del texto no pisa criterios marcados mientras tanto (y viceversa).
 */
export function saveDesignAnswer(
  state: PracticeState,
  challengeId: string,
  patch: { answer?: string; checkedCriteria?: readonly string[] },
  now: Date,
): PracticeState {
  const current = state.design[challengeId];
  return {
    ...state,
    design: {
      ...state.design,
      [challengeId]: {
        answer: (patch.answer ?? current?.answer ?? "").slice(0, MAX_DRAFT_LENGTH),
        checkedCriteria: [...new Set(patch.checkedCriteria ?? current?.checkedCriteria ?? [])],
        updatedAt: now.toISOString(),
      },
    },
  };
}

export function markSolutionRevealed(state: PracticeState, exerciseId: string): PracticeState {
  if (state.solutionsRevealed.includes(exerciseId)) return state;
  return { ...state, solutionsRevealed: [...state.solutionsRevealed, exerciseId] };
}

export type ExerciseStatus = "not-started" | "attempted" | "solved";

export function exerciseStatus(state: PracticeState, exerciseId: string): ExerciseStatus {
  const record = state.attempts[exerciseId];
  if (!record) return "not-started";
  return record.solvedAt ? "solved" : "attempted";
}
