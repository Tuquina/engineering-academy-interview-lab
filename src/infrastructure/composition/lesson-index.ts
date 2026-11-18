import type { Catalog } from "@/modules/learning/domain/catalog";
import type { LessonIndex, LessonLink } from "@/shared/kernel/lesson-link";

/** Construye el índice serializable de lecciones publicado a los componentes de cliente. */
export function buildLessonIndex(catalog: Catalog): LessonIndex {
  const index: Record<string, LessonLink> = {};
  for (const course of catalog.courses) {
    for (const lesson of catalog.getLessonsOfCourse(course.id)) {
      index[lesson.id] = {
        id: lesson.id,
        title: lesson.title,
        href: `/courses/${course.slug}/${lesson.slug}`,
        courseTitle: course.title,
        estimatedMinutes: lesson.estimatedMinutes,
      };
    }
  }
  return index;
}
