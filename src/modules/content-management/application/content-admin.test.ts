import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../../../../tests/support/test-database";
import { DrizzleUserRepository } from "@/modules/auth/infrastructure/drizzle-auth-repositories";
import { customLessonId } from "../domain/custom-content";
import { DrizzleContentRepository } from "../infrastructure/drizzle-content-repository";
import { ContentAdminService, PublicContentQueries, courseToDocument, type Actor } from "./content-admin";
import type { CourseDocument } from "./content-schemas";

const catalog = {
  areaIds: async () => new Set(["ai-agents", "data"]),
  courseIds: async () => new Set(["typescript"]),
  lessonIds: async () => new Set(["typescript.introduction"]),
};

function lesson(
  slug: string,
  overrides: Partial<CourseDocument["lessons"][number]> = {},
): CourseDocument["lessons"][number] {
  return {
    id: randomUUID(),
    moduleId: "modulo-1",
    slug,
    title: `Lección ${slug}`,
    description: "",
    difficulty: "basic",
    estimatedMinutes: 10,
    objectives: ["Entender algo"],
    tags: [],
    prerequisites: [],
    blocks: [
      { id: "b1", type: "paragraph", text: "Hola `mundo`" },
      {
        id: "q1",
        type: "question",
        question: "¿2 + 2?",
        options: [
          { text: "4", correct: true, explanation: "Suma." },
          { text: "5", correct: false, explanation: "No." },
        ],
      },
    ],
    summary: [],
    references: [],
    interviewQuestions: [],
    status: "published",
    ...overrides,
  };
}

describe("administración de contenido contra PostgreSQL (PGlite)", () => {
  let close: () => Promise<void>;
  let service: ContentAdminService;
  let queries: PublicContentQueries;
  let admin: Actor;
  const user: Actor = { id: randomUUID(), role: "user" };

  beforeAll(async () => {
    const test = await createTestDatabase();
    close = test.close;
    const repository = new DrizzleContentRepository(test.db);
    service = new ContentAdminService(repository, catalog);
    queries = new PublicContentQueries(repository);
    const created = await new DrizzleUserRepository(test.db).create(
      {
        email: "admin@example.com",
        displayName: "Admin",
        passwordHash: null,
        githubId: null,
        githubLogin: null,
        role: "user",
      },
      { firstUserRole: "admin" },
    );
    admin = { id: created.id, role: created.role };
  }, 30_000);

  afterAll(() => close());

  it("un usuario común no puede administrar (la regla vive en el caso de uso)", async () => {
    await expect(service.list(user)).rejects.toMatchObject({ code: "forbidden" });
    await expect(service.create(user, { title: "X", areaId: "data" })).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("crea, guarda con versión, publica y expone sólo lo publicado", async () => {
    const course = await service.create(admin, { title: "Colas de mensajes", areaId: "data" });
    expect(course.slug).toBe("colas-de-mensajes");
    const document: CourseDocument = {
      slug: course.slug,
      areaId: "data",
      title: "Colas de mensajes",
      description: "Curso propio",
      difficulty: "intermediate",
      modules: [{ id: "modulo-1", title: "Fundamentos" }],
      prerequisites: ["typescript"],
      lessons: [lesson("que-es-una-cola"), lesson("borrador", { status: "draft" })],
      flashcards: [{ id: randomUUID(), front: "¿Qué es una DLQ?", back: "Una cola de mensajes fallidos." }],
    };
    const saved = await service.save(admin, course.id, course.version, document, "Primera versión");
    expect(saved.course.version).toBe(2);
    expect(await queries.getPublishedCourse(course.slug)).toBeNull(); // todavía es borrador

    await service.setStatus(admin, course.id, saved.course.version, "published");
    const published = await queries.getPublishedCourse(course.slug);
    expect(published?.lessons.map((l) => l.slug)).toEqual(["que-es-una-cola"]);
    expect(published?.flashcards).toHaveLength(1);
    expect((await queries.listPublished()).map((c) => c.slug)).toContain("colas-de-mensajes");
  });

  it("rechaza referencias rotas y escrituras con una versión vieja", async () => {
    const course = (await service.list(admin)).find((c) => c.slug === "colas-de-mensajes")!;
    const full = (await service.get(admin, course.id)).course;
    const base = courseToDocument(full);
    const broken = {
      ...base,
      lessons: [lesson("rota", { prerequisites: ["no.existe"], moduleId: "fantasma" })],
    };
    await expect(service.save(admin, course.id, full.version, broken, "")).rejects.toMatchObject({
      code: "invalid",
    });
    await expect(service.save(admin, course.id, full.version - 1, base, "")).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("exporta e importa de forma idempotente, traduciendo prerrequisitos internos", async () => {
    const course = (await service.list(admin)).find((c) => c.slug === "colas-de-mensajes")!;
    const full = (await service.get(admin, course.id)).course;
    const document = courseToDocument(full);
    const [first, second] = document.lessons;
    const withPrereq = {
      ...document,
      lessons: [first!, { ...second!, prerequisites: [customLessonId(first!.id)] }],
    };
    await service.save(admin, course.id, full.version, withPrereq, "Prerrequisito interno");

    const file = await service.exportAll(admin);
    expect(file.courses[0]!.lessons[1]!.prerequisites).toEqual(["colas-de-mensajes/que-es-una-cola"]);

    const copy = { ...file, courses: file.courses.map((c) => ({ ...c, slug: "copia-de-colas" })) };
    const firstImport = await service.import(admin, copy, "skip", randomUUID);
    expect(firstImport).toMatchObject({ created: ["copia-de-colas"], issues: [] });
    const secondImport = await service.import(admin, copy, "skip", randomUUID);
    expect(secondImport).toMatchObject({ created: [], skipped: ["copia-de-colas"] });
    expect((await service.list(admin)).filter((c) => c.slug === "copia-de-colas")).toHaveLength(1);
  });

  it("restaurar una versión crea una versión nueva y queda auditado", async () => {
    const course = (await service.list(admin)).find((c) => c.slug === "colas-de-mensajes")!;
    const versions = await service.versions(admin, course.id);
    const oldest = versions.at(-1)!;
    const restored = await service.restore(admin, course.id, oldest.version, course.version);
    expect(restored.course.version).toBe(course.version + 1);
    const audit = await service.audit(admin);
    expect(audit.map((a) => a.action)).toEqual(
      expect.arrayContaining(["course.create", "course.publish", "content.import"]),
    );
  });
});
