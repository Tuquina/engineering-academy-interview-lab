import type { LessonIndex } from "@/shared/kernel/lesson-link";
import { findNextLesson, type ProgressState } from "../domain/progress";

export type RecommendationKind =
  "flashcards" | "interview-review" | "review-lesson" | "continue-lesson" | "prerequisite" | "next-lesson";

export interface Recommendation {
  readonly id: string;
  readonly kind: RecommendationKind;
  readonly title: string;
  readonly href: string;
  /** Explicación legible de por qué se recomienda: el algoritmo es transparente, no una caja negra. */
  readonly reason: string;
}

export interface RecommendationInputs {
  readonly progress: ProgressState;
  readonly lessons: LessonIndex;
  /** Prerrequisitos de cada lección (IDs). */
  readonly prerequisites: Readonly<Record<string, readonly string[]>>;
  /** Secuencia de lecciones de la ruta activa. */
  readonly pathSequence: readonly string[];
  readonly dueFlashcards: number;
  /** Lecciones asociadas a flashcards con fallos repetidos (2 o más lapsos). */
  readonly strugglingLessonIds: readonly string[];
  /** Preguntas de entrevista con criterios faltantes en la última respuesta (Interview Arena). */
  readonly weakInterviewQuestions?: number;
  readonly limit?: number;
}

/**
 * Recomienda qué practicar con reglas explícitas y priorizadas (MASTER_PROMPT §22), sin IA:
 *
 * 1. **Repasos vencidos de flashcards:** posponerlos hace que se acumulen y se olviden.
 * 2. **Puntos débiles de entrevista:** preguntas en las que faltaron criterios en la última respuesta.
 * 3. **Errores recientes:** lecciones con preguntas cuya última respuesta fue incorrecta.
 * 4. **Conceptos débiles:** lecciones ligadas a flashcards que se fallaron repetidamente.
 * 5. **Prerrequisitos faltantes** de la próxima lección de la ruta.
 * 6. **Lecciones empezadas** y no terminadas.
 * 7. **Próxima lección** de la ruta activa.
 *
 * Nunca repite la misma lección en dos recomendaciones.
 */
export function buildRecommendations(inputs: RecommendationInputs): Recommendation[] {
  const { progress, lessons } = inputs;
  const result: Recommendation[] = [];
  const usedLessons = new Set<string>();

  const addLesson = (lessonId: string, kind: RecommendationKind, reason: string): void => {
    const lesson = lessons[lessonId];
    if (!lesson || usedLessons.has(lessonId)) return;
    usedLessons.add(lessonId);
    result.push({ id: `${kind}:${lessonId}`, kind, title: lesson.title, href: lesson.href, reason });
  };

  if (inputs.dueFlashcards > 0) {
    result.push({
      id: "flashcards",
      kind: "flashcards",
      title: `Repasar ${inputs.dueFlashcards} ${inputs.dueFlashcards === 1 ? "flashcard vencida" : "flashcards vencidas"}`,
      href: "/flashcards",
      reason: "Repasar en el momento indicado fija la memoria; si se posterga, los repasos se acumulan.",
    });
  }

  const weak = inputs.weakInterviewQuestions ?? 0;
  if (weak > 0) {
    result.push({
      id: "interview-review",
      kind: "interview-review",
      title: `Repasar ${weak} ${weak === 1 ? "pregunta de entrevista" : "preguntas de entrevista"}`,
      href: "/interview/review",
      reason: "En tu última respuesta faltaron criterios esperados; repasarlas cierra esas brechas.",
    });
  }

  const wrongByLesson = new Map<string, number>();
  for (const record of Object.values(progress.questions)) {
    if (!record.lastCorrect)
      wrongByLesson.set(record.lessonId, (wrongByLesson.get(record.lessonId) ?? 0) + 1);
  }
  [...wrongByLesson.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([lessonId, count]) =>
      addLesson(
        lessonId,
        "review-lesson",
        count === 1
          ? "Tu última respuesta a una de sus preguntas fue incorrecta."
          : `Tus últimas respuestas a ${count} de sus preguntas fueron incorrectas.`,
      ),
    );

  inputs.strugglingLessonIds.forEach((lessonId) =>
    addLesson(lessonId, "review-lesson", "Fallaste varias veces flashcards de este tema."),
  );

  const next = findNextLesson(progress, inputs.pathSequence);
  if (next) {
    const missing = (inputs.prerequisites[next] ?? []).filter(
      (id) => progress.lessons[id]?.status !== "completed",
    );
    missing.forEach((id) =>
      addLesson(id, "prerequisite", `Es prerrequisito de «${lessons[next]?.title ?? next}».`),
    );
  }

  Object.entries(progress.lessons)
    .filter(([, lesson]) => lesson.status === "in_progress")
    .sort((a, b) => b[1].lastVisitedAt.localeCompare(a[1].lastVisitedAt))
    .forEach(([lessonId]) =>
      addLesson(lessonId, "continue-lesson", "La empezaste y todavía no la completaste."),
    );

  if (next) addLesson(next, "next-lesson", "Es la siguiente lección de tu ruta activa.");

  return result.slice(0, inputs.limit ?? 5);
}
