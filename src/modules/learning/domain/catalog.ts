import { validateCatalogIntegrity, type IntegrityIssue } from "./catalog-integrity";
import type {
  CatalogData,
  Course,
  CourseModule,
  KnowledgeArea,
  LearningPath,
  LessonMeta,
} from "./catalog-types";

/** Error lanzado cuando los datos del catálogo no son consistentes. Contiene todos los problemas detectados. */
export class CatalogIntegrityError extends Error {
  constructor(readonly issues: readonly IntegrityIssue[]) {
    super(
      `El catálogo tiene ${issues.length} problema(s) de integridad:\n` +
        issues.map((i) => `  - [${i.code}] ${i.message}`).join("\n"),
    );
    this.name = "CatalogIntegrityError";
  }
}

/** Lecciones vecinas dentro del mismo curso, según el orden módulo → lección. */
export interface AdjacentLessons {
  readonly previous: LessonMeta | null;
  readonly next: LessonMeta | null;
}

/** Módulo de un curso junto con sus lecciones publicadas, en orden. */
export interface ModuleWithLessons {
  readonly module: CourseModule;
  readonly lessons: readonly LessonMeta[];
}

const byOrder = <T extends { readonly order: number }>(a: T, b: T): number => a.order - b.order;

/**
 * Catálogo educativo validado y consultable.
 *
 * Es un agregado de sólo lectura: se construye una vez con {@link Catalog.create}, que garantiza la integridad
 * referencial, y expone consultas sin efectos secundarios. Los índices internos hacen que las búsquedas por
 * ID o slug sean O(1).
 */
export class Catalog {
  readonly areas: readonly KnowledgeArea[];
  readonly courses: readonly Course[];
  readonly paths: readonly LearningPath[];

  private readonly courseById: ReadonlyMap<string, Course>;
  private readonly courseBySlug: ReadonlyMap<string, Course>;
  private readonly lessonById: ReadonlyMap<string, LessonMeta>;
  private readonly lessonsByCourse: ReadonlyMap<string, readonly LessonMeta[]>;

  private constructor(data: CatalogData) {
    this.areas = [...data.areas].sort(byOrder);
    // El orden de un curso es relativo a su área: se ordena primero por área y luego por curso.
    const areaOrder = new Map(this.areas.map((a) => [a.id, a.order]));
    this.courses = [...data.courses].sort(
      (a, b) => (areaOrder.get(a.areaId) ?? 0) - (areaOrder.get(b.areaId) ?? 0) || a.order - b.order,
    );
    this.paths = [...data.paths].sort(byOrder);
    this.courseById = new Map(this.courses.map((c) => [c.id, c]));
    this.courseBySlug = new Map(this.courses.map((c) => [c.slug, c]));
    this.lessonById = new Map(data.lessons.map((l) => [l.id, l]));

    const lessonsByCourse = new Map<string, LessonMeta[]>();
    for (const course of this.courses) {
      const moduleOrder = new Map(course.modules.map((m) => [m.id, m.order]));
      const lessons = data.lessons
        .filter((l) => l.courseId === course.id)
        .sort(
          (a, b) =>
            (moduleOrder.get(a.moduleId) ?? 0) - (moduleOrder.get(b.moduleId) ?? 0) || a.order - b.order,
        );
      lessonsByCourse.set(course.id, lessons);
    }
    this.lessonsByCourse = lessonsByCourse;
  }

  /**
   * Construye un catálogo a partir de datos crudos.
   *
   * @throws {CatalogIntegrityError} si hay IDs duplicados, referencias rotas o ciclos de prerrequisitos.
   */
  static create(data: CatalogData): Catalog {
    const issues = validateCatalogIntegrity(data);
    if (issues.length > 0) throw new CatalogIntegrityError(issues);
    return new Catalog(data);
  }

  /** Cantidad total de lecciones publicadas. */
  get lessonCount(): number {
    return this.lessonById.size;
  }

  getCourseById(id: string): Course | undefined {
    return this.courseById.get(id);
  }

  getCourseBySlug(slug: string): Course | undefined {
    return this.courseBySlug.get(slug);
  }

  getCoursesByArea(areaId: string): readonly Course[] {
    return this.courses.filter((c) => c.areaId === areaId);
  }

  getLessonById(id: string): LessonMeta | undefined {
    return this.lessonById.get(id);
  }

  /** Lecciones de un curso ordenadas por módulo y luego por orden de lección. */
  getLessonsOfCourse(courseId: string): readonly LessonMeta[] {
    return this.lessonsByCourse.get(courseId) ?? [];
  }

  getLessonBySlug(courseSlug: string, lessonSlug: string): LessonMeta | undefined {
    const course = this.courseBySlug.get(courseSlug);
    if (!course) return undefined;
    return this.getLessonsOfCourse(course.id).find((l) => l.slug === lessonSlug);
  }

  /** Módulos del curso (ordenados) con sus lecciones; incluye módulos que todavía no tienen lecciones. */
  getModulesWithLessons(courseId: string): readonly ModuleWithLessons[] {
    const course = this.courseById.get(courseId);
    if (!course) return [];
    const lessons = this.getLessonsOfCourse(courseId);
    return [...course.modules]
      .sort(byOrder)
      .map((module) => ({ module, lessons: lessons.filter((l) => l.moduleId === module.id) }));
  }

  getAdjacentLessons(lessonId: string): AdjacentLessons {
    const lesson = this.lessonById.get(lessonId);
    if (!lesson) return { previous: null, next: null };
    const lessons = this.getLessonsOfCourse(lesson.courseId);
    const index = lessons.findIndex((l) => l.id === lessonId);
    return { previous: lessons[index - 1] ?? null, next: lessons[index + 1] ?? null };
  }

  getPathBySlug(slug: string): LearningPath | undefined {
    return this.paths.find((p) => p.slug === slug);
  }

  /**
   * Secuencia ordenada y sin duplicados de lecciones de una ruta. Los elementos de tipo curso se expanden a
   * todas sus lecciones, de modo que la ruta crece automáticamente al publicar lecciones nuevas.
   */
  resolvePathLessons(path: LearningPath): readonly LessonMeta[] {
    const seen = new Set<string>();
    const result: LessonMeta[] = [];
    const add = (lesson: LessonMeta | undefined): void => {
      if (lesson && !seen.has(lesson.id)) {
        seen.add(lesson.id);
        result.push(lesson);
      }
    };
    for (const stage of path.stages) {
      for (const item of stage.items) {
        if (item.kind === "lesson") add(this.lessonById.get(item.lessonId));
        else this.getLessonsOfCourse(item.courseId).forEach(add);
      }
    }
    return result;
  }
}
