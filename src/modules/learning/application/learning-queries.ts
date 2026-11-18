import { Catalog, type AdjacentLessons } from "../domain/catalog";
import type { Course, CourseModule, KnowledgeArea, LessonMeta } from "../domain/catalog-types";
import type { ContentSource } from "./content-source";

/** Vista completa de una lección lista para presentarse. */
export interface LessonView {
  readonly area: KnowledgeArea | undefined;
  readonly course: Course;
  readonly module: CourseModule;
  readonly lesson: LessonMeta;
  readonly body: string;
  readonly adjacent: AdjacentLessons;
}

/**
 * Casos de uso de lectura del catálogo.
 *
 * Recibe la fuente de contenido por constructor (inyección explícita) y no conoce Next.js, de modo que puede
 * probarse con una fuente en memoria.
 */
export class LearningQueries {
  constructor(private readonly source: ContentSource) {}

  /**
   * Carga y valida el catálogo completo.
   * @throws {import("../domain/catalog").CatalogIntegrityError} si el contenido es inconsistente.
   */
  async getCatalog(): Promise<Catalog> {
    return Catalog.create(await this.source.loadCatalogData());
  }

  /**
   * Obtiene una lección por slugs de curso y lección.
   * @returns `null` si el curso o la lección no existen (la capa HTTP lo traduce a 404).
   * @throws {Error} si los metadatos existen pero falta el cuerpo: es un error de contenido, no un 404.
   */
  async getLessonView(catalog: Catalog, courseSlug: string, lessonSlug: string): Promise<LessonView | null> {
    const lesson = catalog.getLessonBySlug(courseSlug, lessonSlug);
    if (!lesson) return null;
    const course = catalog.getCourseById(lesson.courseId);
    const courseModule = course?.modules.find((m) => m.id === lesson.moduleId);
    if (!course || !courseModule) return null;

    const body = await this.source.loadLessonBody(lesson.id);
    if (body === null) throw new Error(`No se encontró el cuerpo de la lección "${lesson.id}".`);

    return {
      area: catalog.areas.find((a) => a.id === course.areaId),
      course,
      module: courseModule,
      lesson,
      body,
      adjacent: catalog.getAdjacentLessons(lesson.id),
    };
  }
}
