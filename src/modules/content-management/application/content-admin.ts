import {
  checkIntegrity,
  customLessonId,
  hasBlockingIssues,
  slugify,
  type ContentStatus,
  type CourseSummary,
  type CustomCourse,
  type IntegrityContext,
  type IntegrityIssue,
} from "../domain/custom-content";
import {
  CONTENT_FORMAT,
  CONTENT_FORMAT_VERSION,
  type ContentFile,
  type CourseDocument,
} from "./content-schemas";

/** Quién ejecuta la acción. La autorización se decide acá, no en la interfaz (MASTER_PROMPT §29). */
export interface Actor {
  readonly id: string;
  readonly role: "user" | "admin";
}

export interface VersionInfo {
  readonly version: number;
  readonly note: string;
  readonly createdAt: string;
}

export interface AuditEntry {
  readonly id: number;
  readonly actorId: string | null;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly details: Record<string, unknown>;
  readonly createdAt: string;
}

export type SaveResult = { ok: true; course: CustomCourse } | { ok: false; reason: "conflict" | "not_found" };

export interface ContentRepository {
  list(): Promise<CourseSummary[]>;
  listPublished(): Promise<CourseSummary[]>;
  get(id: string): Promise<CustomCourse | null>;
  getBySlug(slug: string): Promise<CustomCourse | null>;
  slugExists(slug: string): Promise<boolean>;
  /** Todos los IDs públicos de lecciones personalizadas (`custom.<uuid>`), para validar prerrequisitos. */
  customLessonIds(): Promise<string[]>;
  customCourseIds(): Promise<string[]>;
  create(input: { slug: string; areaId: string; title: string; createdBy: string }): Promise<CustomCourse>;
  /**
   * Reemplaza el curso completo si la versión coincide (concurrencia optimista), incrementa la versión y guarda
   * una instantánea, todo en una transacción.
   */
  save(
    id: string,
    expectedVersion: number,
    document: CourseDocument,
    note: string,
    actorId: string,
  ): Promise<SaveResult>;
  setStatus(id: string, expectedVersion: number, status: ContentStatus, actorId: string): Promise<SaveResult>;
  delete(id: string): Promise<boolean>;
  versions(id: string): Promise<VersionInfo[]>;
  snapshot(id: string, version: number): Promise<CourseDocument | null>;
  audit(entry: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
  recentAudit(limit: number): Promise<AuditEntry[]>;
}

/** Datos del contenido del repositorio necesarios para validar referencias. */
export interface RepositoryCatalog {
  areaIds(): Promise<ReadonlySet<string>>;
  lessonIds(): Promise<ReadonlySet<string>>;
  courseIds(): Promise<ReadonlySet<string>>;
}

export class ContentError extends Error {
  constructor(
    readonly code: "forbidden" | "not_found" | "conflict" | "invalid" | "slug_taken",
    message: string,
    readonly issues: readonly IntegrityIssue[] = [],
  ) {
    super(message);
  }
}

/**
 * Casos de uso de la administración de contenido. Cada uno verifica que el actor sea administrador, valida
 * integridad (referencias rotas), usa concurrencia optimista y deja un registro de auditoría.
 */
export class ContentAdminService {
  constructor(
    private readonly repository: ContentRepository,
    private readonly catalog: RepositoryCatalog,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async list(actor: Actor) {
    requireAdmin(actor);
    return this.repository.list();
  }

  async get(actor: Actor, id: string) {
    requireAdmin(actor);
    const course = await this.repository.get(id);
    if (!course) throw new ContentError("not_found", "El curso no existe.");
    return { course, issues: checkIntegrity(course, await this.integrityContext()) };
  }

  async create(actor: Actor, input: { title: string; areaId: string; slug?: string }) {
    requireAdmin(actor);
    const slug = input.slug ?? slugify(input.title);
    if (!slug) throw new ContentError("invalid", "El título no genera un slug válido.");
    if ((await this.catalog.areaIds()).has(input.areaId) === false) {
      throw new ContentError("invalid", `El área "${input.areaId}" no existe.`);
    }
    if (await this.repository.slugExists(slug)) {
      throw new ContentError("slug_taken", `Ya existe un curso con el slug "${slug}".`);
    }
    const course = await this.repository.create({
      slug,
      areaId: input.areaId,
      title: input.title,
      createdBy: actor.id,
    });
    await this.repository.audit({
      actorId: actor.id,
      action: "course.create",
      entityType: "course",
      entityId: course.id,
      details: { slug },
    });
    return course;
  }

  async save(actor: Actor, id: string, expectedVersion: number, document: CourseDocument, note: string) {
    requireAdmin(actor);
    const current = await this.repository.get(id);
    if (!current) throw new ContentError("not_found", "El curso no existe.");
    if (document.slug !== current.slug && (await this.repository.slugExists(document.slug))) {
      throw new ContentError("slug_taken", `Ya existe un curso con el slug "${document.slug}".`);
    }
    const candidate: CustomCourse = { ...current, ...document };
    const issues = checkIntegrity(candidate, await this.integrityContext());
    if (hasBlockingIssues(issues))
      throw new ContentError("invalid", "El curso tiene referencias o datos inválidos.", issues);
    const result = await this.repository.save(id, expectedVersion, document, note, actor.id);
    if (!result.ok) throw conflictOrMissing(result.reason);
    await this.repository.audit({
      actorId: actor.id,
      action: "course.save",
      entityType: "course",
      entityId: id,
      details: { version: result.course.version, note },
    });
    return { course: result.course, issues };
  }

  async setStatus(actor: Actor, id: string, expectedVersion: number, status: ContentStatus) {
    requireAdmin(actor);
    const current = await this.repository.get(id);
    if (!current) throw new ContentError("not_found", "El curso no existe.");
    if (status === "published") {
      const issues = checkIntegrity({ ...current, status }, await this.integrityContext());
      if (hasBlockingIssues(issues))
        throw new ContentError("invalid", "No se puede publicar con errores de integridad.", issues);
    }
    const result = await this.repository.setStatus(id, expectedVersion, status, actor.id);
    if (!result.ok) throw conflictOrMissing(result.reason);
    await this.repository.audit({
      actorId: actor.id,
      action: `course.${status === "published" ? "publish" : "unpublish"}`,
      entityType: "course",
      entityId: id,
    });
    return result.course;
  }

  async delete(actor: Actor, id: string) {
    requireAdmin(actor);
    if (!(await this.repository.delete(id))) throw new ContentError("not_found", "El curso no existe.");
    await this.repository.audit({
      actorId: actor.id,
      action: "course.delete",
      entityType: "course",
      entityId: id,
    });
  }

  async versions(actor: Actor, id: string) {
    requireAdmin(actor);
    return this.repository.versions(id);
  }

  /** Restaurar = guardar una versión nueva con el contenido de una anterior (el historial nunca se reescribe). */
  async restore(actor: Actor, id: string, version: number, expectedVersion: number) {
    requireAdmin(actor);
    const snapshot = await this.repository.snapshot(id, version);
    if (!snapshot) throw new ContentError("not_found", `No existe la versión ${version}.`);
    return this.save(actor, id, expectedVersion, snapshot, `Restaurada la versión ${version}`);
  }

  async exportAll(actor: Actor): Promise<ContentFile> {
    requireAdmin(actor);
    const summaries = await this.repository.list();
    const courses = (await Promise.all(summaries.map((s) => this.repository.get(s.id)))).filter(
      (c): c is CustomCourse => c !== null,
    );
    // Los prerrequisitos internos se exportan por slug (`slug-del-curso/slug-de-leccion`): los UUID no viajan.
    const bySlug = new Map(
      courses.flatMap((c) => c.lessons.map((l) => [customLessonId(l.id), `${c.slug}/${l.slug}`] as const)),
    );
    return {
      format: CONTENT_FORMAT,
      version: CONTENT_FORMAT_VERSION,
      exportedAt: this.clock().toISOString(),
      courses: courses.map((c) => ({
        slug: c.slug,
        areaId: c.areaId,
        title: c.title,
        description: c.description,
        difficulty: c.difficulty,
        modules: [...c.modules],
        prerequisites: [...c.prerequisites],
        status: c.status,
        lessons: c.lessons.map(({ id: _id, ...lesson }) => ({
          ...lesson,
          prerequisites: lesson.prerequisites.map((p) => bySlug.get(p) ?? p),
          objectives: [...lesson.objectives],
          tags: [...lesson.tags],
          blocks: lesson.blocks.map((b) => structuredClone(b)) as CourseDocument["lessons"][number]["blocks"],
          summary: [...lesson.summary],
          references: lesson.references.map((r) => ({ ...r })),
          interviewQuestions: lesson.interviewQuestions.map((q) => ({
            question: q.question,
            keyPoints: [...q.keyPoints],
          })),
        })),
        flashcards: c.flashcards.map(({ front, back }) => ({ front, back })),
      })),
    };
  }

  /**
   * Importa un archivo validado. Es idempotente por slug: con `skip` no toca cursos existentes; con `replace` los
   * actualiza guardando una versión nueva. Los prerrequisitos `curso/leccion` se traducen a IDs locales.
   */
  async import(actor: Actor, file: ContentFile, mode: "skip" | "replace", newId: () => string) {
    requireAdmin(actor);
    const created: string[] = [];
    const updated: string[] = [];
    const skipped: string[] = [];
    const idsBySlug = new Map<string, string>();
    const plans: { course: CustomCourse; document: CourseDocument; status: ContentStatus }[] = [];

    for (const incoming of file.courses) {
      let course = await this.repository.getBySlug(incoming.slug);
      if (course && mode === "skip") {
        skipped.push(incoming.slug);
        for (const lesson of course.lessons)
          idsBySlug.set(`${course.slug}/${lesson.slug}`, customLessonId(lesson.id));
        continue;
      }
      if (!course) {
        course = await this.repository.create({
          slug: incoming.slug,
          areaId: incoming.areaId,
          title: incoming.title,
          createdBy: actor.id,
        });
        created.push(incoming.slug);
      } else {
        updated.push(incoming.slug);
      }
      const existing = new Map(course.lessons.map((l) => [l.slug, l.id]));
      const lessons = incoming.lessons.map((lesson) => {
        const lessonId = existing.get(lesson.slug) ?? newId();
        idsBySlug.set(`${incoming.slug}/${lesson.slug}`, customLessonId(lessonId));
        return { ...lesson, id: lessonId };
      });
      plans.push({
        course,
        status: incoming.status,
        document: {
          slug: incoming.slug,
          areaId: incoming.areaId,
          title: incoming.title,
          description: incoming.description,
          difficulty: incoming.difficulty,
          modules: incoming.modules,
          prerequisites: incoming.prerequisites,
          lessons,
          flashcards: incoming.flashcards.map((f) => ({ ...f, id: newId() })),
        },
      });
    }

    // Referencias `curso/leccion` a cursos que no vienen en el archivo pero ya existen en la base.
    const unresolved = new Set(
      plans
        .flatMap((p) => p.document.lessons.flatMap((l) => l.prerequisites))
        .filter((p) => p.includes("/") && !idsBySlug.has(p)),
    );
    for (const reference of unresolved) {
      const [courseSlug, lessonSlug] = reference.split("/");
      const existing = courseSlug ? await this.repository.getBySlug(courseSlug) : null;
      const target = existing?.lessons.find((l) => l.slug === lessonSlug);
      if (target) idsBySlug.set(reference, customLessonId(target.id));
    }

    const issues: IntegrityIssue[] = [];
    for (const plan of plans) {
      const document = {
        ...plan.document,
        lessons: plan.document.lessons.map((l) => ({
          ...l,
          prerequisites: l.prerequisites.map((p) => idsBySlug.get(p) ?? p),
        })),
      };
      try {
        const saved = await this.save(actor, plan.course.id, plan.course.version, document, "Importado");
        if (plan.status !== saved.course.status)
          await this.setStatus(actor, plan.course.id, saved.course.version, plan.status);
      } catch (cause) {
        if (cause instanceof ContentError)
          issues.push(...cause.issues.map((i) => ({ ...i, path: `${plan.document.slug}: ${i.path}` })));
        else throw cause;
      }
    }
    await this.repository.audit({
      actorId: actor.id,
      action: "content.import",
      entityType: "content",
      entityId: "import",
      details: { created, updated, skipped, mode },
    });
    return { created, updated, skipped, issues };
  }

  async audit(actor: Actor, limit = 50) {
    requireAdmin(actor);
    return this.repository.recentAudit(limit);
  }

  private async integrityContext(): Promise<IntegrityContext> {
    const [areaIds, repoLessons, repoCourses, customLessons, customCourses] = await Promise.all([
      this.catalog.areaIds(),
      this.catalog.lessonIds(),
      this.catalog.courseIds(),
      this.repository.customLessonIds(),
      this.repository.customCourseIds(),
    ]);
    return {
      areaIds,
      lessonIds: new Set([...repoLessons, ...customLessons]),
      courseIds: new Set([...repoCourses, ...customCourses]),
    };
  }
}

function requireAdmin(actor: Actor | null): asserts actor is Actor {
  if (!actor || actor.role !== "admin")
    throw new ContentError("forbidden", "Se requiere una cuenta administradora.");
}

function conflictOrMissing(reason: "conflict" | "not_found") {
  return reason === "conflict"
    ? new ContentError(
        "conflict",
        "Otra persona (u otra pestaña) guardó cambios antes. Recargá para ver la versión actual.",
      )
    : new ContentError("not_found", "El curso no existe.");
}

/** Consultas públicas: sólo contenido publicado. */
export class PublicContentQueries {
  constructor(private readonly repository: ContentRepository) {}

  listPublished() {
    return this.repository.listPublished();
  }

  async getPublishedCourse(slug: string, options: { preview: boolean } = { preview: false }) {
    const course = await this.repository.getBySlug(slug);
    if (!course) return null;
    if (options.preview) return course;
    if (course.status !== "published") return null;
    return { ...course, lessons: course.lessons.filter((l) => l.status === "published") };
  }
}

/** Copia editable de un curso (el dominio usa colecciones de sólo lectura; el documento de edición, mutables). */
export function courseToDocument(course: CustomCourse): CourseDocument {
  return structuredClone({
    slug: course.slug,
    areaId: course.areaId,
    title: course.title,
    description: course.description,
    difficulty: course.difficulty,
    modules: course.modules,
    prerequisites: course.prerequisites,
    lessons: course.lessons,
    flashcards: course.flashcards,
  }) as CourseDocument;
}
