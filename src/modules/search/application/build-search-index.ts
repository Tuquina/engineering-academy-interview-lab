import type { Catalog } from "@/modules/learning/domain/catalog";
import type { SearchEntry } from "../domain/search";

export interface CheatsheetSummary {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
}

export interface SearchIndexSources {
  readonly catalog: Catalog;
  /** Encabezados de cada lección (por ID), para poder saltar directo a una sección. */
  readonly lessonHeadings: Readonly<Record<string, ReadonlyArray<{ id: string; text: string }>>>;
  readonly cheatsheets: readonly CheatsheetSummary[];
  /** Páginas de la aplicación (secciones navegables) que también deben poder encontrarse. */
  readonly pages: ReadonlyArray<{ id: string; title: string; href: string; keywords: readonly string[] }>;
}

/**
 * Construye el índice de búsqueda a partir del catálogo y otras fuentes de contenido.
 * Es una función pura: no lee archivos; la raíz de composición le entrega los datos ya cargados.
 */
export function buildSearchIndex(sources: SearchIndexSources): SearchEntry[] {
  const { catalog } = sources;
  const entries: SearchEntry[] = sources.pages.map((page) => ({
    id: `page:${page.id}`,
    kind: "page",
    title: page.title,
    context: "Sección",
    href: page.href,
    keywords: page.keywords,
  }));

  for (const course of catalog.courses) {
    entries.push({
      id: `course:${course.id}`,
      kind: "course",
      title: course.title,
      context: course.description,
      href: `/courses/${course.slug}`,
      keywords: [...course.tags, ...course.modules.flatMap((m) => [m.title, ...m.topics])],
    });

    for (const lesson of catalog.getLessonsOfCourse(course.id)) {
      const href = `/courses/${course.slug}/${lesson.slug}`;
      entries.push({
        id: `lesson:${lesson.id}`,
        kind: "lesson",
        title: lesson.title,
        context: course.title,
        href,
        keywords: [
          ...lesson.tags,
          lesson.description,
          ...lesson.objectives,
          ...lesson.summary,
          ...lesson.interviewQuestions.map((q) => q.question),
        ],
      });
      for (const heading of sources.lessonHeadings[lesson.id] ?? []) {
        entries.push({
          id: `section:${lesson.id}#${heading.id}`,
          kind: "section",
          title: heading.text,
          context: lesson.title,
          href: `${href}#${heading.id}`,
          keywords: [],
        });
      }
    }
  }

  for (const path of catalog.paths) {
    entries.push({
      id: `path:${path.id}`,
      kind: "path",
      title: path.title,
      context: "Ruta de aprendizaje",
      href: `/paths/${path.slug}`,
      keywords: [path.description, ...path.stages.map((s) => s.title)],
    });
  }

  for (const sheet of sources.cheatsheets) {
    entries.push({
      id: `cheatsheet:${sheet.slug}`,
      kind: "cheatsheet",
      title: sheet.title,
      context: "Cheatsheet",
      href: `/cheatsheets/${sheet.slug}`,
      keywords: [sheet.description, ...sheet.tags],
    });
  }

  return entries;
}
