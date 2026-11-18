import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { LearningQueries } from "@/modules/learning/application/learning-queries";
import type { Catalog } from "@/modules/learning/domain/catalog";
import { FileSystemContentSource } from "@/modules/learning/infrastructure/file-system-content-source";
import { extractHeadings } from "@/modules/learning/presentation/lesson/extract-headings";

/**
 * Integridad del contenido real del repositorio. Falla si un autor agrega contenido con frontmatter inválido,
 * referencias rotas o lecciones que no siguen la estructura pedagógica mínima.
 */
const source = new FileSystemContentSource(path.resolve(import.meta.dirname, "../../content"));
const queries = new LearningQueries(source);
let catalog: Catalog;

beforeAll(async () => {
  catalog = await queries.getCatalog();
});

describe("contenido del repositorio", () => {
  it("carga un catálogo íntegro con al menos una ruta y una lección", () => {
    expect(catalog.paths.length).toBeGreaterThan(0);
    expect(catalog.lessonCount).toBeGreaterThan(0);
  });

  it("cada curso pertenece a un área y tiene temario en todos sus módulos", () => {
    for (const course of catalog.courses) {
      expect(catalog.areas.some((a) => a.id === course.areaId)).toBe(true);
      for (const courseModule of course.modules) {
        expect(courseModule.topics.length, `${course.id}/${courseModule.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("cada lección tiene cuerpo sustantivo, secciones y referencias", async () => {
    for (const course of catalog.courses) {
      for (const lesson of catalog.getLessonsOfCourse(course.id)) {
        const view = await queries.getLessonView(catalog, course.slug, lesson.slug);
        expect(view, lesson.id).not.toBeNull();
        const headings = extractHeadings(view!.body).filter((h) => h.depth === 2);
        expect(headings.length, `${lesson.id}: secciones h2`).toBeGreaterThanOrEqual(5);
        expect(view!.body.length, `${lesson.id}: longitud`).toBeGreaterThan(3000);
        expect(lesson.references.length, `${lesson.id}: referencias`).toBeGreaterThan(0);
        expect(lesson.interviewQuestions.length, `${lesson.id}: preguntas`).toBeGreaterThan(0);
      }
    }
  });

  it("la ruta principal resuelve lecciones publicadas", () => {
    const path = catalog.getPathBySlug("full-stack-ai-platform-engineer");
    expect(path).toBeDefined();
    expect(catalog.resolvePathLessons(path!).length).toBeGreaterThan(0);
  });
});
