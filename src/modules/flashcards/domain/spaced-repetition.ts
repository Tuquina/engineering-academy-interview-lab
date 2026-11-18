import type { Flashcard } from "./deck";

/**
 * Repetición espaciada: adaptación documentada del algoritmo SM-2 (P. Wozniak, 1987).
 *
 * SM-2 original, por repaso con calidad `q ∈ [0, 5]`:
 * - Si `q < 3`: se reinician las repeticiones y el factor de facilidad (EF) **no** cambia.
 * - Si `q ≥ 3`: intervalo 1 día en la 1.ª repetición, 6 días en la 2.ª y luego `intervalo_anterior × EF`;
 *   después se actualiza `EF' = EF + (0.1 − (5 − q) × (0.08 + (5 − q) × 0.02))`, con mínimo 1.3.
 *
 * Adaptaciones de esta plataforma:
 * 1. Una tarjeta fallada vuelve a la cola a los {@link RELEARN_DELAY_MINUTES} minutos (reaprendizaje en la misma
 *    sesión) en lugar de esperar al día siguiente.
 * 2. La interfaz expone cuatro botones que corresponden a `q = 1, 3, 4, 5` (Otra vez, Difícil, Bien, Fácil).
 * 3. Las tarjetas nuevas por día se limitan para que la carga de repasos futura sea sostenible.
 */

export type Grade = 0 | 1 | 2 | 3 | 4 | 5;

export const INITIAL_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;
export const RELEARN_DELAY_MINUTES = 10;

export interface CardSchedule {
  readonly repetitions: number;
  readonly easeFactor: number;
  readonly intervalDays: number;
  readonly dueAt: string;
  readonly lastReviewedAt: string;
  /** Día (local) del primer repaso: permite contar cuántas tarjetas nuevas se introdujeron hoy. */
  readonly firstReviewedDay: string;
  readonly lapses: number;
  readonly reviews: number;
}

/**
 * Calcula la nueva planificación de una tarjeta tras un repaso.
 *
 * @param previous planificación actual; `undefined` si la tarjeta es nueva.
 * @param grade calidad de la respuesta (0–5).
 * @param now instante del repaso.
 * @param today día local del repaso (`YYYY-MM-DD`).
 */
export function scheduleReview(
  previous: CardSchedule | undefined,
  grade: Grade,
  now: Date,
  today: string,
): CardSchedule {
  const easeFactor = previous?.easeFactor ?? INITIAL_EASE_FACTOR;
  const base = {
    lastReviewedAt: now.toISOString(),
    firstReviewedDay: previous?.firstReviewedDay ?? today,
    reviews: (previous?.reviews ?? 0) + 1,
  };

  if (grade < 3) {
    return {
      ...base,
      repetitions: 0,
      easeFactor,
      intervalDays: 0,
      dueAt: new Date(now.getTime() + RELEARN_DELAY_MINUTES * 60_000).toISOString(),
      lapses: (previous?.lapses ?? 0) + (previous ? 1 : 0),
    };
  }

  const repetitions = (previous?.repetitions ?? 0) + 1;
  const intervalDays =
    repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round((previous?.intervalDays || 1) * easeFactor);
  const q = 5 - grade;
  const nextEase = Math.max(MIN_EASE_FACTOR, easeFactor + (0.1 - q * (0.08 + q * 0.02)));

  return {
    ...base,
    repetitions,
    easeFactor: Math.round(nextEase * 1000) / 1000,
    intervalDays,
    dueAt: new Date(now.getTime() + intervalDays * 86_400_000).toISOString(),
    lapses: previous?.lapses ?? 0,
  };
}

export const FLASHCARDS_SCHEMA_VERSION = 1;

export interface FlashcardsState {
  readonly schemaVersion: typeof FLASHCARDS_SCHEMA_VERSION;
  readonly schedules: Readonly<Record<string, CardSchedule>>;
  /** Cantidad de repasos por día local, para estadísticas. */
  readonly reviewsByDay: Readonly<Record<string, number>>;
}

export const EMPTY_FLASHCARDS: FlashcardsState = Object.freeze({
  schemaVersion: FLASHCARDS_SCHEMA_VERSION,
  schedules: Object.freeze({}),
  reviewsByDay: Object.freeze({}),
});

/** Registra un repaso: actualiza la planificación de la tarjeta y el contador diario. */
export function recordReview(
  state: FlashcardsState,
  cardId: string,
  grade: Grade,
  now: Date,
  today: string,
): FlashcardsState {
  return {
    ...state,
    schedules: { ...state.schedules, [cardId]: scheduleReview(state.schedules[cardId], grade, now, today) },
    reviewsByDay: { ...state.reviewsByDay, [today]: (state.reviewsByDay[today] ?? 0) + 1 },
  };
}

export interface StudyQueue {
  /** Tarjetas ya vistas cuyo repaso venció, de la más atrasada a la menos. */
  readonly due: readonly Flashcard[];
  /** Tarjetas nuevas habilitadas hoy (respetando el límite diario). */
  readonly fresh: readonly Flashcard[];
  /** Tarjetas nuevas que quedan fuera por el límite diario. */
  readonly freshRemaining: number;
}

/**
 * Arma la cola de estudio: primero repasos vencidos, luego tarjetas nuevas hasta completar el límite diario
 * (descontando las nuevas que ya se introdujeron hoy).
 */
export function buildStudyQueue(
  cards: readonly Flashcard[],
  state: FlashcardsState,
  now: Date,
  today: string,
  newPerDay: number,
): StudyQueue {
  const nowIso = now.toISOString();
  const due = cards
    .filter((card) => {
      const schedule = state.schedules[card.id];
      return schedule !== undefined && schedule.dueAt <= nowIso;
    })
    .sort((a, b) => state.schedules[a.id]!.dueAt.localeCompare(state.schedules[b.id]!.dueAt));

  const introducedToday = Object.values(state.schedules).filter((s) => s.firstReviewedDay === today).length;
  const unseen = cards.filter((card) => !state.schedules[card.id]);
  const allowance = Math.max(0, newPerDay - introducedToday);
  return {
    due,
    fresh: unseen.slice(0, allowance),
    freshRemaining: Math.max(0, unseen.length - allowance),
  };
}

/** Tarjetas con más fallos acumulados: señal de conceptos débiles. */
export function strugglingCards(
  cards: readonly Flashcard[],
  state: FlashcardsState,
  limit: number,
): ReadonlyArray<{ card: Flashcard; lapses: number }> {
  return cards
    .map((card) => ({ card, lapses: state.schedules[card.id]?.lapses ?? 0 }))
    .filter((entry) => entry.lapses > 0)
    .sort((a, b) => b.lapses - a.lapses)
    .slice(0, limit);
}
