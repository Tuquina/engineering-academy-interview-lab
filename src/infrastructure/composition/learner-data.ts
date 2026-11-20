import type { LearnerData } from "@/modules/progress/presentation/learner-data";
import { getChallenges } from "./challenges";
import { getDecks } from "./flashcards";
import { getCatalog } from "./learning";
import { buildLessonIndex } from "./lesson-index";

/** Ruta activa por defecto mientras el usuario no elija otra. */
export const DEFAULT_PATH_ID = "full-stack-typescript";

/**
 * Datos de catálogo serializables que necesitan el dashboard y las estadísticas para combinarse, en el cliente,
 * con el progreso local del usuario.
 */
export async function getLearnerData(): Promise<LearnerData> {
  const [catalog, decks, challenges] = await Promise.all([getCatalog(), getDecks(), getChallenges()]);
  const prerequisites: Record<string, readonly string[]> = {};
  for (const course of catalog.courses) {
    for (const lesson of catalog.getLessonsOfCourse(course.id))
      prerequisites[lesson.id] = lesson.prerequisites;
  }
  return {
    defaultPathId: DEFAULT_PATH_ID,
    paths: catalog.paths.map((path) => ({
      id: path.id,
      title: path.title,
      description: path.description,
      href: `/paths/${path.slug}`,
      lessonIds: catalog.resolvePathLessons(path).map((l) => l.id),
    })),
    courses: catalog.courses.map((course) => ({
      id: course.id,
      title: course.title,
      href: `/courses/${course.slug}`,
      lessonIds: catalog.getLessonsOfCourse(course.id).map((l) => l.id),
    })),
    lessons: buildLessonIndex(catalog),
    prerequisites,
    challenges: challenges.map((c) => ({ id: c.id, title: c.title, href: `/challenges/${c.slug}` })),
    cards: decks.flatMap((deck) =>
      deck.cards.map((card) => ({
        id: card.id,
        front: card.front,
        lessonId: card.lessonId,
        deckTitle: deck.title,
      })),
    ),
  };
}
