import path from "node:path";
import { cache } from "react";
import { extractHeadings } from "@/modules/learning/presentation/lesson/extract-headings";
import {
  loadCheatsheets,
  type Cheatsheet,
} from "@/modules/learning/infrastructure/file-system-cheatsheet-source";
import { buildSearchIndex } from "@/modules/search/application/build-search-index";
import type { SearchEntry } from "@/modules/search/domain/search";
import { MAIN_SECTIONS } from "@/shared/navigation/main-sections";
import { getCatalog, getLearningQueries } from "./learning";

const CONTENT_ROOT = path.join(process.cwd(), "content");

/** Cheatsheets del repositorio (releídas en desarrollo, cacheadas por request). */
export const getCheatsheets = cache((): Promise<Cheatsheet[]> => loadCheatsheets(CONTENT_ROOT));

/**
 * Índice del buscador global. Incluye secciones de la app, cursos, lecciones, sus apartados (encabezados),
 * rutas y cheatsheets. Se construye en el servidor y se envía serializado al cliente.
 */
export const getSearchIndex = cache(async (): Promise<SearchEntry[]> => {
  const [catalog, cheatsheets] = await Promise.all([getCatalog(), getCheatsheets()]);
  const queries = getLearningQueries();

  const lessonHeadings: Record<string, Array<{ id: string; text: string }>> = {};
  for (const course of catalog.courses) {
    for (const lesson of catalog.getLessonsOfCourse(course.id)) {
      const view = await queries.getLessonView(catalog, course.slug, lesson.slug);
      lessonHeadings[lesson.id] = view ? extractHeadings(view.body).filter((h) => h.depth === 2) : [];
    }
  }

  return buildSearchIndex({
    catalog,
    lessonHeadings,
    cheatsheets,
    pages: [
      ...MAIN_SECTIONS.filter((s) => s.status === "available").map((s) => ({
        id: s.id,
        title: s.label,
        href: s.href,
        keywords: [],
      })),
    ],
  });
});
