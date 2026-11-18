import { describe, expect, it } from "vitest";
import {
  EMPTY_PROGRESS,
  completeLesson,
  findNextLesson,
  recentLessons,
  recordLessonVisit,
  reopenLesson,
  summarizeProgress,
} from "./progress";

const t1 = new Date("2026-11-01T10:00:00.000Z");
const t2 = new Date("2026-11-02T10:00:00.000Z");
const t3 = new Date("2026-11-03T10:00:00.000Z");

describe("progreso de lecciones", () => {
  it("la primera visita inicia la lección y las siguientes sólo actualizan la última visita", () => {
    const first = recordLessonVisit(EMPTY_PROGRESS, "a", t1);
    const second = recordLessonVisit(first, "a", t2);
    expect(second.lessons.a).toEqual({
      status: "in_progress",
      startedAt: t1.toISOString(),
      lastVisitedAt: t2.toISOString(),
      completedAt: null,
    });
  });

  it("no muta el estado recibido", () => {
    const before = recordLessonVisit(EMPTY_PROGRESS, "a", t1);
    completeLesson(before, "a", t2);
    expect(before.lessons.a?.status).toBe("in_progress");
    expect(EMPTY_PROGRESS.lessons).toEqual({});
  });

  it("completar es idempotente y conserva la fecha original", () => {
    const once = completeLesson(EMPTY_PROGRESS, "a", t1);
    const twice = completeLesson(once, "a", t2);
    expect(twice).toBe(once);
    expect(twice.lessons.a?.completedAt).toBe(t1.toISOString());
  });

  it("visitar una lección completada no la degrada", () => {
    const state = recordLessonVisit(completeLesson(EMPTY_PROGRESS, "a", t1), "a", t2);
    expect(state.lessons.a?.status).toBe("completed");
    expect(state.lessons.a?.lastVisitedAt).toBe(t2.toISOString());
  });

  it("reabrir vuelve la lección a 'en curso' y no afecta lecciones no completadas", () => {
    const reopened = reopenLesson(completeLesson(EMPTY_PROGRESS, "a", t1), "a");
    expect(reopened.lessons.a?.status).toBe("in_progress");
    expect(reopened.lessons.a?.completedAt).toBeNull();
    expect(reopenLesson(EMPTY_PROGRESS, "x")).toBe(EMPTY_PROGRESS);
  });
});

describe("summarizeProgress", () => {
  it("cuenta estados sobre IDs únicos", () => {
    let state = completeLesson(EMPTY_PROGRESS, "a", t1);
    state = recordLessonVisit(state, "b", t1);
    expect(summarizeProgress(state, ["a", "b", "c", "a"])).toEqual({
      total: 3,
      completed: 1,
      inProgress: 1,
      ratio: 1 / 3,
    });
  });

  it("devuelve ratio 0 cuando no hay lecciones", () => {
    expect(summarizeProgress(EMPTY_PROGRESS, []).ratio).toBe(0);
  });
});

describe("findNextLesson", () => {
  it("prioriza terminar lo que está en curso", () => {
    const state = recordLessonVisit(EMPTY_PROGRESS, "c", t1);
    expect(findNextLesson(state, ["a", "b", "c"])).toBe("c");
  });

  it("si no hay nada en curso, sugiere la primera no iniciada", () => {
    const state = completeLesson(EMPTY_PROGRESS, "a", t1);
    expect(findNextLesson(state, ["a", "b", "c"])).toBe("b");
  });

  it("devuelve null cuando todo está completado", () => {
    const state = completeLesson(EMPTY_PROGRESS, "a", t1);
    expect(findNextLesson(state, ["a"])).toBeNull();
    expect(findNextLesson(EMPTY_PROGRESS, [])).toBeNull();
  });
});

describe("recentLessons", () => {
  it("ordena por última visita descendente y respeta el límite", () => {
    let state = recordLessonVisit(EMPTY_PROGRESS, "a", t1);
    state = recordLessonVisit(state, "b", t3);
    state = recordLessonVisit(state, "c", t2);
    expect(recentLessons(state, 2).map((r) => r.id)).toEqual(["b", "c"]);
  });
});
