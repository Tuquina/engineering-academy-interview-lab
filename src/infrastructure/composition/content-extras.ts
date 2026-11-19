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
import { SIMULATIONS } from "@/modules/system-design/domain/simulations/catalog";
import { getArchitectureContent } from "./architecture";
import { getChallenges } from "./challenges";
import { getCatalog, getLearningQueries } from "./learning";
import { getArchitectureChallenges } from "./system-design";

const CONTENT_ROOT = path.join(process.cwd(), "content");

/** Cheatsheets del repositorio (releídas en desarrollo, cacheadas por request). */
export const getCheatsheets = cache((): Promise<Cheatsheet[]> => loadCheatsheets(CONTENT_ROOT));

/**
 * Índice del buscador global. Incluye secciones de la app, cursos, lecciones, sus apartados (encabezados),
 * rutas y cheatsheets. Se construye en el servidor y se envía serializado al cliente.
 */
export const getSearchIndex = cache(async (): Promise<SearchEntry[]> => {
  const [catalog, cheatsheets, architecture, challenges, architectureChallenges] = await Promise.all([
    getCatalog(),
    getCheatsheets(),
    getArchitectureContent(),
    getChallenges(),
    getArchitectureChallenges(),
  ]);
  const extraEntries: SearchEntry[] = [
    ...architecture.patterns.map((p): SearchEntry => ({
      id: `pattern:${p.slug}`,
      kind: "pattern",
      title: p.title,
      context: p.summary,
      href: `/patterns/${p.slug}`,
      keywords: [...p.tags, p.definition, ...p.interviewQuestions.map((q) => q.question)],
    })),
    ...architecture.diagrams.map((d): SearchEntry => ({
      id: `diagram:${d.id}`,
      kind: "pattern",
      title: d.title,
      context: "Diagrama interactivo",
      href: `/patterns/diagrams/${d.id}`,
      keywords: d.tags,
    })),
    ...challenges.map((c): SearchEntry => ({
      id: `challenge:${c.slug}`,
      kind: "practice",
      title: c.title,
      context: `Challenge · ${c.summary}`,
      href: `/challenges/${c.slug}`,
      keywords: [...c.topics, ...c.technologies],
    })),
    ...architectureChallenges.map((c): SearchEntry => ({
      id: `sd-challenge:${c.slug}`,
      kind: "practice",
      title: c.title,
      context: `Desafío de arquitectura · ${c.summary}`,
      href: `/system-design/challenges/${c.slug}`,
      keywords: c.topics,
    })),
    ...SIMULATIONS.map((s): SearchEntry => ({
      id: `simulator:${s.slug}`,
      kind: "practice",
      title: s.title,
      context: `Simulador · ${s.summary}`,
      href: `/system-design/simulators/${s.slug}`,
      keywords: s.topics,
    })),
  ];
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
    extraEntries,
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
