"use client";

import { useMemo } from "react";
import { createStoreContext } from "@/shared/lib/create-store-context";
import { toDayKey } from "@/shared/kernel/day-key";
import {
  EMPTY_PROGRESS,
  addStudyTime,
  completeLesson,
  recordAnswer,
  recordLessonVisit,
  recordReadingPosition,
  reopenLesson,
  type ProgressState,
} from "../domain/progress";

const progressContext = createStoreContext<ProgressState>("Progress", EMPTY_PROGRESS);

/** Provee el store de progreso. La implementación concreta se decide en la raíz de composición. */
export const ProgressProvider = progressContext.Provider;

/** Estado de progreso reactivo (vacío durante SSR e hidratación). */
export const useProgressState = progressContext.useStoreState;

export interface ProgressActions {
  recordVisit(lessonId: string): void;
  recordPosition(lessonId: string, sectionId: string): void;
  complete(lessonId: string): void;
  reopen(lessonId: string): void;
  answer(questionId: string, lessonId: string, correct: boolean): void;
  addStudySeconds(seconds: number): void;
}

/** Acciones de progreso; encapsulan el reloj y la persistencia para que los componentes no los conozcan. */
export function useProgressActions(): ProgressActions {
  const store = progressContext.useStore();
  return useMemo(
    () => ({
      recordVisit: (lessonId) => store.update((s) => recordLessonVisit(s, lessonId, new Date())),
      recordPosition: (lessonId, sectionId) =>
        store.update((s) => recordReadingPosition(s, lessonId, sectionId)),
      complete: (lessonId) => store.update((s) => completeLesson(s, lessonId, new Date())),
      reopen: (lessonId) => store.update((s) => reopenLesson(s, lessonId)),
      answer: (questionId, lessonId, correct) =>
        store.update((s) => recordAnswer(s, { questionId, lessonId, correct }, new Date())),
      addStudySeconds: (seconds) => store.update((s) => addStudyTime(s, toDayKey(new Date()), seconds)),
    }),
    [store],
  );
}
