import { and, asc, count, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { Database } from "@/infrastructure/database/database";
import type { ContentRepository, SaveResult } from "../application/content-admin";
import type { CourseDocument } from "../application/content-schemas";
import {
  customCourseId,
  customLessonId,
  type ContentStatus,
  type CourseSummary,
  type CustomCourse,
  type CustomLesson,
} from "../domain/custom-content";
import { auditLog, contentVersions, customCourses, customFlashcards, customLessons } from "./content-tables";

type CourseRow = typeof customCourses.$inferSelect;
type LessonRow = typeof customLessons.$inferSelect;

function toLesson(row: LessonRow): CustomLesson {
  return {
    id: row.id,
    moduleId: row.moduleId,
    slug: row.slug,
    title: row.title,
    description: row.description,
    difficulty: row.difficulty as CustomLesson["difficulty"],
    estimatedMinutes: row.estimatedMinutes,
    objectives: row.objectives as string[],
    tags: row.tags,
    prerequisites: row.prerequisites,
    blocks: row.blocks as CustomLesson["blocks"],
    summary: row.summary as string[],
    references: row.references as CustomLesson["references"],
    interviewQuestions: row.interviewQuestions as CustomLesson["interviewQuestions"],
    status: row.status,
  };
}

function toSummary(row: CourseRow, lessonCount: number): CourseSummary {
  return {
    id: row.id,
    slug: row.slug,
    areaId: row.areaId,
    title: row.title,
    description: row.description,
    difficulty: row.difficulty as CourseSummary["difficulty"],
    status: row.status,
    version: row.version,
    lessonCount,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Persistencia del contenido personalizado. Un curso se lee con 3 consultas fijas (curso, lecciones y flashcards),
 * sin N+1; guardar reemplaza lecciones y flashcards dentro de una transacción con control de versión.
 */
export class DrizzleContentRepository implements ContentRepository {
  constructor(private readonly db: Database) {}

  async list() {
    return this.summaries();
  }

  async listPublished() {
    return this.summaries("published");
  }

  private async summaries(status?: ContentStatus) {
    const lessonCount = this.db
      .select({ courseId: customLessons.courseId, total: count().as("total") })
      .from(customLessons)
      .where(status ? eq(customLessons.status, status) : undefined)
      .groupBy(customLessons.courseId)
      .as("lesson_count");
    const rows = await this.db
      .select({ course: customCourses, total: lessonCount.total })
      .from(customCourses)
      .leftJoin(lessonCount, eq(lessonCount.courseId, customCourses.id))
      .where(status ? eq(customCourses.status, status) : undefined)
      .orderBy(asc(customCourses.title));
    return rows.map((r) => toSummary(r.course, Number(r.total ?? 0)));
  }

  async get(id: string) {
    const [row] = await this.db.select().from(customCourses).where(eq(customCourses.id, id)).limit(1);
    return row ? this.hydrate(row) : null;
  }

  async getBySlug(slug: string) {
    const [row] = await this.db.select().from(customCourses).where(eq(customCourses.slug, slug)).limit(1);
    return row ? this.hydrate(row) : null;
  }

  private async hydrate(row: CourseRow): Promise<CustomCourse> {
    const [lessons, flashcards] = await Promise.all([
      this.db
        .select()
        .from(customLessons)
        .where(eq(customLessons.courseId, row.id))
        .orderBy(asc(customLessons.position)),
      this.db
        .select({ id: customFlashcards.id, front: customFlashcards.front, back: customFlashcards.back })
        .from(customFlashcards)
        .where(eq(customFlashcards.courseId, row.id))
        .orderBy(asc(customFlashcards.position)),
    ]);
    return {
      id: row.id,
      slug: row.slug,
      areaId: row.areaId,
      title: row.title,
      description: row.description,
      difficulty: row.difficulty as CustomCourse["difficulty"],
      modules: row.modules as CustomCourse["modules"],
      prerequisites: row.prerequisites,
      status: row.status,
      version: row.version,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      lessons: lessons.map(toLesson),
      flashcards,
    };
  }

  async slugExists(slug: string) {
    const [row] = await this.db
      .select({ id: customCourses.id })
      .from(customCourses)
      .where(eq(customCourses.slug, slug))
      .limit(1);
    return Boolean(row);
  }

  async customLessonIds() {
    const rows = await this.db.select({ id: customLessons.id }).from(customLessons);
    return rows.map((r) => customLessonId(r.id));
  }

  async customCourseIds() {
    const rows = await this.db.select({ id: customCourses.id }).from(customCourses);
    return rows.map((r) => customCourseId(r.id));
  }

  async create(input: { slug: string; areaId: string; title: string; createdBy: string }) {
    const [row] = await this.db
      .insert(customCourses)
      .values({
        slug: input.slug,
        areaId: input.areaId,
        title: input.title,
        description: "",
        difficulty: "basic",
        modules: [{ id: "modulo-1", title: "Módulo 1" }],
        createdBy: input.createdBy,
      })
      .returning();
    return this.hydrate(row!);
  }

  async save(
    id: string,
    expectedVersion: number,
    document: CourseDocument,
    note: string,
    actorId: string,
  ): Promise<SaveResult> {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(customCourses)
        .set({
          slug: document.slug,
          areaId: document.areaId,
          title: document.title,
          description: document.description,
          difficulty: document.difficulty,
          modules: document.modules,
          prerequisites: document.prerequisites,
          version: sql`${customCourses.version} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(customCourses.id, id), eq(customCourses.version, expectedVersion)))
        .returning({ version: customCourses.version });
      if (!updated) {
        const [exists] = await tx
          .select({ id: customCourses.id })
          .from(customCourses)
          .where(eq(customCourses.id, id));
        return { ok: false as const, reason: exists ? ("conflict" as const) : ("not_found" as const) };
      }

      const lessonIds = document.lessons.map((l) => l.id);
      await tx
        .delete(customLessons)
        .where(
          lessonIds.length
            ? and(eq(customLessons.courseId, id), notInArray(customLessons.id, lessonIds))
            : eq(customLessons.courseId, id),
        );
      if (lessonIds.length) {
        // Un id de lección de otro curso no se puede "robar" mediante el upsert.
        const foreign = await tx
          .select({ id: customLessons.id })
          .from(customLessons)
          .where(and(inArray(customLessons.id, lessonIds), sql`${customLessons.courseId} <> ${id}`));
        if (foreign.length) throw new Error("Hay lecciones que pertenecen a otro curso.");
        for (const [position, lesson] of document.lessons.entries()) {
          const values = { ...lesson, courseId: id, position, version: 1, updatedAt: new Date() };
          await tx
            .insert(customLessons)
            .values(values)
            .onConflictDoUpdate({
              target: customLessons.id,
              set: { ...values, version: sql`${customLessons.version} + 1` },
            });
        }
      }

      await tx.delete(customFlashcards).where(eq(customFlashcards.courseId, id));
      if (document.flashcards.length) {
        await tx
          .insert(customFlashcards)
          .values(document.flashcards.map((card, position) => ({ ...card, courseId: id, position })));
      }

      await tx.insert(contentVersions).values({
        courseId: id,
        version: updated.version,
        snapshot: document,
        note,
        createdBy: actorId,
      });
      const [row] = await tx.select().from(customCourses).where(eq(customCourses.id, id));
      return { ok: true as const, course: await this.hydrateWith(tx, row!) };
    });
  }

  private hydrateWith(db: Database, row: CourseRow) {
    return new DrizzleContentRepository(db).hydrate(row);
  }

  async setStatus(id: string, expectedVersion: number, status: ContentStatus): Promise<SaveResult> {
    const [row] = await this.db
      .update(customCourses)
      .set({
        status,
        version: sql`${customCourses.version} + 1`,
        publishedAt: status === "published" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(customCourses.id, id), eq(customCourses.version, expectedVersion)))
      .returning();
    if (!row) return { ok: false, reason: (await this.slugOf(id)) ? "conflict" : "not_found" };
    return { ok: true, course: await this.hydrate(row) };
  }

  private async slugOf(id: string) {
    const [row] = await this.db
      .select({ slug: customCourses.slug })
      .from(customCourses)
      .where(eq(customCourses.id, id));
    return row?.slug ?? null;
  }

  async delete(id: string) {
    const deleted = await this.db
      .delete(customCourses)
      .where(eq(customCourses.id, id))
      .returning({ id: customCourses.id });
    return deleted.length > 0;
  }

  async versions(id: string) {
    const rows = await this.db
      .select({
        version: contentVersions.version,
        note: contentVersions.note,
        createdAt: contentVersions.createdAt,
      })
      .from(contentVersions)
      .where(eq(contentVersions.courseId, id))
      .orderBy(desc(contentVersions.version))
      .limit(50);
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  }

  async snapshot(id: string, version: number) {
    const [row] = await this.db
      .select({ snapshot: contentVersions.snapshot })
      .from(contentVersions)
      .where(and(eq(contentVersions.courseId, id), eq(contentVersions.version, version)));
    return (row?.snapshot as CourseDocument | undefined) ?? null;
  }

  async audit(entry: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: Record<string, unknown>;
  }) {
    await this.db.insert(auditLog).values({ ...entry, details: entry.details ?? {} });
  }

  async recentAudit(limit: number) {
    const rows = await this.db.select().from(auditLog).orderBy(desc(auditLog.id)).limit(limit);
    return rows.map((r) => ({
      id: r.id,
      actorId: r.actorId,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      details: r.details as Record<string, unknown>,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
