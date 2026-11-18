import { describe, expect, it } from "vitest";
import { Catalog, CatalogIntegrityError } from "./catalog";
import { validateCatalogIntegrity } from "./catalog-integrity";
import type { CatalogData, Course, LessonMeta } from "./catalog-types";

const course = (overrides: Partial<Course> = {}): Course => ({
  id: "ts",
  slug: "typescript",
  title: "TypeScript",
  description: "d",
  areaId: "lang",
  difficulty: "basic",
  order: 1,
  prerequisites: [],
  tags: [],
  modules: [
    { id: "ts.m2", slug: "m2", title: "M2", description: "d", order: 2, topics: [] },
    { id: "ts.m1", slug: "m1", title: "M1", description: "d", order: 1, topics: [] },
  ],
  ...overrides,
});

const lesson = (overrides: Partial<LessonMeta> & Pick<LessonMeta, "id" | "slug">): LessonMeta => ({
  courseId: "ts",
  moduleId: "ts.m1",
  title: overrides.id,
  description: "d",
  difficulty: "basic",
  order: 1,
  objectives: ["o"],
  prerequisites: [],
  estimatedMinutes: 10,
  tags: [],
  version: "1.0.0",
  references: [],
  relatedExercises: [],
  relatedChallenges: [],
  interviewQuestions: [],
  diagrams: [],
  summary: ["s"],
  comparesWith: [],
  ...overrides,
});

const baseData = (): CatalogData => ({
  areas: [{ id: "lang", slug: "lang", title: "Lenguajes", description: "d", order: 1 }],
  courses: [course()],
  lessons: [
    lesson({ id: "ts.c", slug: "c", moduleId: "ts.m2", order: 1 }),
    lesson({ id: "ts.b", slug: "b", order: 2 }),
    lesson({ id: "ts.a", slug: "a", order: 1 }),
  ],
  paths: [
    {
      id: "p",
      slug: "p",
      title: "Ruta",
      description: "d",
      audience: "a",
      order: 1,
      stages: [
        {
          id: "s1",
          title: "S1",
          description: "d",
          goals: [],
          items: [
            { kind: "lesson", lessonId: "ts.b" },
            { kind: "course", courseId: "ts" },
          ],
        },
      ],
    },
  ],
});

describe("validateCatalogIntegrity", () => {
  it("no reporta problemas en un catálogo consistente", () => {
    expect(validateCatalogIntegrity(baseData())).toEqual([]);
  });

  it("detecta IDs duplicados y slugs repetidos dentro de un curso", () => {
    const data = baseData();
    const issues = validateCatalogIntegrity({
      ...data,
      lessons: [...data.lessons, lesson({ id: "ts.a", slug: "a" })],
    });
    expect(issues.map((i) => i.code)).toEqual(expect.arrayContaining(["duplicate-id", "duplicate-slug"]));
  });

  it("detecta referencias rotas a áreas, módulos, lecciones y cursos", () => {
    const data = baseData();
    const issues = validateCatalogIntegrity({
      ...data,
      courses: [course({ areaId: "missing", prerequisites: ["ghost-course"] })],
      lessons: [lesson({ id: "ts.x", slug: "x", moduleId: "ts.missing", prerequisites: ["ghost-lesson"] })],
    });
    expect(issues.map((i) => i.code).sort()).toEqual(
      ["unknown-area", "unknown-course", "unknown-lesson", "unknown-lesson", "unknown-module"].sort(),
    );
  });

  it("detecta ciclos de prerrequisitos y autorreferencias", () => {
    const data = baseData();
    const issues = validateCatalogIntegrity({
      ...data,
      lessons: [
        lesson({ id: "ts.a", slug: "a", prerequisites: ["ts.b"] }),
        lesson({ id: "ts.b", slug: "b", prerequisites: ["ts.a"] }),
        lesson({ id: "ts.c", slug: "c", prerequisites: ["ts.c"] }),
      ],
    });
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("prerequisite-cycle");
    expect(codes).toContain("self-prerequisite");
  });
});

describe("Catalog", () => {
  it("falla rápido con todos los problemas cuando los datos son inconsistentes", () => {
    const data = { ...baseData(), courses: [course({ areaId: "missing" })] };
    expect(() => Catalog.create(data)).toThrow(CatalogIntegrityError);
  });

  it("ordena las lecciones por orden de módulo y luego de lección", () => {
    const catalog = Catalog.create(baseData());
    expect(catalog.getLessonsOfCourse("ts").map((l) => l.id)).toEqual(["ts.a", "ts.b", "ts.c"]);
  });

  it("devuelve lecciones vecinas dentro del curso", () => {
    const catalog = Catalog.create(baseData());
    const adjacent = catalog.getAdjacentLessons("ts.b");
    expect(adjacent.previous?.id).toBe("ts.a");
    expect(adjacent.next?.id).toBe("ts.c");
    expect(catalog.getAdjacentLessons("ts.a").previous).toBeNull();
  });

  it("incluye módulos sin lecciones al agrupar por módulo", () => {
    const data = baseData();
    const catalog = Catalog.create({ ...data, lessons: data.lessons.filter((l) => l.moduleId === "ts.m1") });
    const modules = catalog.getModulesWithLessons("ts");
    expect(modules.map((m) => [m.module.id, m.lessons.length])).toEqual([
      ["ts.m1", 2],
      ["ts.m2", 0],
    ]);
  });

  it("expande cursos en las rutas sin duplicar lecciones ya incluidas", () => {
    const catalog = Catalog.create(baseData());
    const path = catalog.getPathBySlug("p");
    expect(path).toBeDefined();
    expect(catalog.resolvePathLessons(path!).map((l) => l.id)).toEqual(["ts.b", "ts.a", "ts.c"]);
  });

  it("busca lecciones por slug de curso y de lección", () => {
    const catalog = Catalog.create(baseData());
    expect(catalog.getLessonBySlug("typescript", "b")?.id).toBe("ts.b");
    expect(catalog.getLessonBySlug("typescript", "zzz")).toBeUndefined();
    expect(catalog.getLessonBySlug("nope", "b")).toBeUndefined();
  });
});
