import { describe, expect, it } from "vitest";
import type { Flashcard } from "./deck";
import {
  EMPTY_FLASHCARDS,
  INITIAL_EASE_FACTOR,
  MIN_EASE_FACTOR,
  RELEARN_DELAY_MINUTES,
  buildStudyQueue,
  recordReview,
  scheduleReview,
  strugglingCards,
} from "./spaced-repetition";

const now = new Date("2026-11-18T10:00:00.000Z");
const today = "2026-11-18";
const days = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString();

const card = (id: string): Flashcard => ({
  id,
  deckId: "d",
  front: "f",
  back: "b",
  difficulty: "basic",
  tags: [],
  lessonId: null,
});

describe("scheduleReview (SM-2 adaptado)", () => {
  it("sigue la secuencia de intervalos 1, 6 y luego intervalo × EF", () => {
    const first = scheduleReview(undefined, 4, now, today);
    expect(first).toMatchObject({
      repetitions: 1,
      intervalDays: 1,
      easeFactor: INITIAL_EASE_FACTOR,
      dueAt: days(1),
    });
    const second = scheduleReview(first, 4, now, today);
    expect(second).toMatchObject({ repetitions: 2, intervalDays: 6 });
    const third = scheduleReview(second, 4, now, today);
    expect(third).toMatchObject({ repetitions: 3, intervalDays: 15 }); // round(6 × 2.5)
  });

  it("ajusta el factor de facilidad según la calidad", () => {
    expect(scheduleReview(undefined, 5, now, today).easeFactor).toBe(2.6);
    expect(scheduleReview(undefined, 3, now, today).easeFactor).toBe(2.36);
  });

  it("nunca baja el factor de facilidad de 1.3", () => {
    let schedule = scheduleReview(undefined, 3, now, today);
    for (let i = 0; i < 20; i++) schedule = scheduleReview(schedule, 3, now, today);
    expect(schedule.easeFactor).toBe(MIN_EASE_FACTOR);
  });

  it("un fallo reinicia repeticiones, conserva EF, suma un lapso y reprograma a minutos", () => {
    const learned = scheduleReview(scheduleReview(undefined, 5, now, today), 5, now, today);
    const failed = scheduleReview(learned, 1, now, today);
    expect(failed).toMatchObject({
      repetitions: 0,
      intervalDays: 0,
      easeFactor: learned.easeFactor,
      lapses: 1,
    });
    expect(failed.dueAt).toBe(new Date(now.getTime() + RELEARN_DELAY_MINUTES * 60_000).toISOString());
    // Tras el fallo, el siguiente acierto vuelve a empezar por 1 día.
    expect(scheduleReview(failed, 4, now, today).intervalDays).toBe(1);
  });

  it("fallar una tarjeta nueva no cuenta como lapso", () => {
    expect(scheduleReview(undefined, 0, now, today).lapses).toBe(0);
  });
});

describe("buildStudyQueue", () => {
  const cards = ["a", "b", "c", "d", "e"].map(card);

  it("prioriza vencidas por antigüedad y limita las nuevas por día", () => {
    let state = recordReview(EMPTY_FLASHCARDS, "a", 4, new Date("2026-11-10T10:00:00Z"), "2026-11-10");
    state = recordReview(state, "b", 4, new Date("2026-11-05T10:00:00Z"), "2026-11-05");
    const queue = buildStudyQueue(cards, state, now, today, 2);
    expect(queue.due.map((c) => c.id)).toEqual(["b", "a"]);
    expect(queue.fresh.map((c) => c.id)).toEqual(["c", "d"]);
    expect(queue.freshRemaining).toBe(1);
  });

  it("descuenta del límite las tarjetas nuevas ya introducidas hoy", () => {
    const state = recordReview(EMPTY_FLASHCARDS, "a", 4, now, today);
    const queue = buildStudyQueue(cards, state, now, today, 2);
    expect(queue.fresh.map((c) => c.id)).toEqual(["b"]);
    expect(queue.due).toEqual([]);
  });

  it("cuenta repasos por día y detecta tarjetas con fallos", () => {
    let state = recordReview(EMPTY_FLASHCARDS, "a", 4, now, today);
    state = recordReview(state, "a", 1, now, today);
    expect(state.reviewsByDay[today]).toBe(2);
    expect(strugglingCards(cards, state, 5).map((s) => [s.card.id, s.lapses])).toEqual([["a", 1]]);
  });
});
