"use client";

import { useMemo } from "react";
import { useFlashcardsState } from "@/modules/flashcards/presentation/flashcards-context";
import { useInterviewsState } from "@/modules/interviews/presentation/interviews-context";
import { usePreferences } from "@/modules/preferences/presentation/preferences-context";
import { toDayKey } from "@/shared/kernel/day-key";
import type { LessonIndex } from "@/shared/kernel/lesson-link";
import { buildRecommendations, type Recommendation } from "../application/recommendations";
import { summarizeQuiz, type QuizSummary } from "../domain/progress";
import { computeStreak, totalMinutes } from "../domain/study-stats";
import { useProgressState } from "./progress-context";

/** Datos de catálogo serializables que prepara el servidor. */
export interface LearnerData {
  readonly defaultPathId: string;
  readonly paths: ReadonlyArray<{ id: string; title: string; href: string; lessonIds: readonly string[] }>;
  readonly courses: ReadonlyArray<{ id: string; title: string; href: string; lessonIds: readonly string[] }>;
  readonly lessons: LessonIndex;
  readonly prerequisites: Readonly<Record<string, readonly string[]>>;
  readonly cards: ReadonlyArray<{ id: string; front: string; lessonId: string | null; deckTitle: string }>;
  /** Challenges en el orden del catálogo (de menor a mayor dificultad). */
  readonly challenges: ReadonlyArray<{ id: string; title: string; href: string }>;
}

export interface LearnerSnapshot {
  /** `false` durante SSR e hidratación: los valores locales todavía no se conocen. */
  readonly ready: boolean;
  readonly activePath: LearnerData["paths"][number] | undefined;
  readonly streakDays: number;
  readonly minutesLast7Days: number;
  readonly dueFlashcards: number;
  readonly reviewedFlashcards: number;
  readonly quiz: QuizSummary;
  readonly strugglingCards: ReadonlyArray<{
    id: string;
    front: string;
    lessonId: string | null;
    deckTitle: string;
    lapses: number;
  }>;
  readonly recommendations: readonly Recommendation[];
  readonly today: string | null;
}

/**
 * Combina el catálogo con el progreso, las flashcards y las preferencias locales del usuario.
 * Las métricas dependientes del día se calculan sólo en el cliente, con su zona horaria.
 */
export function useLearnerSnapshot(data: LearnerData, isClient: boolean): LearnerSnapshot {
  const progress = useProgressState();
  const flashcards = useFlashcardsState();
  const preferences = usePreferences();
  const interviews = useInterviewsState();

  return useMemo(() => {
    const now = new Date();
    const today = isClient ? toDayKey(now) : null;
    const activePath =
      data.paths.find((p) => p.id === preferences.activePathId) ??
      data.paths.find((p) => p.id === data.defaultPathId) ??
      data.paths[0];

    const nowIso = now.toISOString();
    const dueFlashcards = isClient
      ? data.cards.filter((card) => {
          const schedule = flashcards.schedules[card.id];
          return schedule !== undefined && schedule.dueAt <= nowIso;
        }).length
      : 0;
    const strugglingCards = data.cards
      .map((card) => ({ ...card, lapses: flashcards.schedules[card.id]?.lapses ?? 0 }))
      .filter((card) => card.lapses > 0)
      .sort((a, b) => b.lapses - a.lapses)
      .slice(0, 5);

    return {
      ready: isClient,
      activePath,
      streakDays: today ? computeStreak(progress.studySeconds, today) : 0,
      minutesLast7Days: today ? totalMinutes(progress.studySeconds, today, 7) : 0,
      dueFlashcards,
      reviewedFlashcards: Object.values(flashcards.reviewsByDay).reduce((sum, n) => sum + n, 0),
      quiz: summarizeQuiz(progress),
      strugglingCards,
      recommendations: buildRecommendations({
        progress,
        lessons: data.lessons,
        prerequisites: data.prerequisites,
        pathSequence: activePath?.lessonIds ?? [],
        dueFlashcards,
        strugglingLessonIds: strugglingCards
          .filter((c) => c.lapses >= 2 && c.lessonId)
          .map((c) => c.lessonId as string),
        weakInterviewQuestions: Object.keys(interviews.weakPoints).length,
      }),
      today,
    };
  }, [data, progress, flashcards, interviews, preferences.activePathId, isClient]);
}
