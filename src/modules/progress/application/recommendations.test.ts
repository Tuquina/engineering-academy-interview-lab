import { describe, expect, it } from "vitest";
import type { LessonIndex } from "@/shared/kernel/lesson-link";
import { EMPTY_PROGRESS, completeLesson, recordAnswer, recordLessonVisit } from "../domain/progress";
import { buildRecommendations, type RecommendationInputs } from "./recommendations";

const lessons: LessonIndex = Object.fromEntries(
  ["a", "b", "c", "d"].map((id) => [
    id,
    { id, title: `Lección ${id}`, href: `/l/${id}`, courseTitle: "Curso", estimatedMinutes: 10 },
  ]),
);
const t = new Date("2026-11-18T10:00:00Z");

const base: RecommendationInputs = {
  progress: EMPTY_PROGRESS,
  lessons,
  prerequisites: {},
  pathSequence: ["a", "b", "c"],
  dueFlashcards: 0,
  strugglingLessonIds: [],
};

describe("buildRecommendations", () => {
  it("sin historial recomienda la primera lección de la ruta", () => {
    expect(buildRecommendations(base).map((r) => r.id)).toEqual(["next-lesson:a"]);
  });

  it("prioriza flashcards vencidas y lecciones con errores, con un motivo explícito", () => {
    const progress = recordAnswer(EMPTY_PROGRESS, { questionId: "q", lessonId: "c", correct: false }, t);
    const recs = buildRecommendations({ ...base, progress, dueFlashcards: 3 });
    expect(recs.map((r) => r.kind)).toEqual(["flashcards", "review-lesson", "next-lesson"]);
    expect(recs[0]?.title).toBe("Repasar 3 flashcards vencidas");
    expect(recs[1]?.reason).toMatch(/incorrecta/);
  });

  it("propone prerrequisitos faltantes antes que la próxima lección", () => {
    const progress = completeLesson(EMPTY_PROGRESS, "a", t);
    const recs = buildRecommendations({ ...base, progress, prerequisites: { b: ["d"] } });
    expect(recs.map((r) => r.id)).toEqual(["prerequisite:d", "next-lesson:b"]);
  });

  it("no repite lecciones y respeta el límite", () => {
    let progress = recordLessonVisit(EMPTY_PROGRESS, "a", t);
    progress = recordAnswer(progress, { questionId: "q", lessonId: "a", correct: false }, t);
    const recs = buildRecommendations({ ...base, progress, strugglingLessonIds: ["a"], limit: 5 });
    expect(recs.filter((r) => r.href === "/l/a")).toHaveLength(1);
    expect(buildRecommendations({ ...base, dueFlashcards: 1, limit: 1 })).toHaveLength(1);
  });
});
