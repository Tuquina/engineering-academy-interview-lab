import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { COMPARISON_DIMENSIONS } from "@/modules/architecture/domain/comparison";
import { missingPatternSections } from "@/modules/architecture/domain/pattern";
import {
  loadArchitectureContent,
  type ArchitectureContent,
} from "@/modules/architecture/infrastructure/file-system-architecture-source";
import { INTERVIEW_AREAS, type InterviewQuestion } from "@/modules/interviews/domain/question";
import { loadInterviewQuestions } from "@/modules/interviews/infrastructure/file-system-question-source";
import { LearningQueries } from "@/modules/learning/application/learning-queries";
import type { Catalog } from "@/modules/learning/domain/catalog";
import { FileSystemContentSource } from "@/modules/learning/infrastructure/file-system-content-source";
import type { ArchitectureChallenge } from "@/modules/system-design/domain/architecture-challenge";
import { loadArchitectureChallenges } from "@/modules/system-design/infrastructure/file-system-architecture-challenge-source";

/**
 * Verifica el contenido de la Fase 4 contra el catálogo real: secciones obligatorias de cada patrón, referencias
 * cruzadas (lecciones, patrones, diagramas, simuladores) y cobertura mínima del banco de preguntas.
 */
const contentRoot = path.resolve(import.meta.dirname, "../../content");
let architecture: ArchitectureContent;
let challenges: ArchitectureChallenge[];
let questions: InterviewQuestion[];
let catalog: Catalog;

beforeAll(async () => {
  [architecture, challenges, questions, catalog] = await Promise.all([
    loadArchitectureContent(contentRoot),
    loadArchitectureChallenges(contentRoot),
    loadInterviewQuestions(contentRoot),
    new LearningQueries(new FileSystemContentSource(contentRoot)).getCatalog(),
  ]);
});

const lessonExists = (id: string) =>
  catalog.courses.some((c) => catalog.getLessonsOfCourse(c.id).some((l) => l.id === id));
const patternExists = (slug: string) => architecture.patterns.some((p) => p.slug === slug);

describe("biblioteca de patrones", () => {
  it("tiene patrones de diseño y de arquitectura", () => {
    expect(architecture.patterns.filter((p) => p.kind === "design").length).toBeGreaterThanOrEqual(5);
    expect(architecture.patterns.filter((p) => p.kind === "architecture").length).toBeGreaterThanOrEqual(5);
  });

  it("cada patrón tiene las secciones requeridas en orden", () => {
    for (const pattern of architecture.patterns) {
      expect(missingPatternSections(pattern.body), pattern.slug).toEqual([]);
      expect(pattern.body, pattern.slug).toContain("<Reveal");
    }
  });

  it("los slugs no chocan con rutas fijas y las lecciones relacionadas existen", () => {
    for (const pattern of architecture.patterns) {
      expect(["compare", "diagrams"]).not.toContain(pattern.slug);
      for (const lesson of pattern.relatedLessons)
        expect(lessonExists(lesson), `${pattern.slug} → ${lesson}`).toBe(true);
    }
  });

  it("los diagramas obligatorios existen y cada uno tiene un recorrido paso a paso", () => {
    const ids = architecture.diagrams.map((d) => d.id);
    for (const required of [
      "hexagonal",
      "layers-and-dependencies",
      "modular-monolith",
      "microservices",
      "event-driven",
      "cqrs",
      "saga",
      "transactional-outbox",
      "circuit-breaker",
      "sync-vs-async",
    ]) {
      expect(ids).toContain(required);
    }
    for (const diagram of architecture.diagrams)
      expect(diagram.steps.length, diagram.id).toBeGreaterThanOrEqual(3);
  });

  it("el comparador cubre todas las dimensiones de cada arquitectura", () => {
    expect(architecture.profiles.length).toBeGreaterThanOrEqual(3);
    for (const profile of architecture.profiles) {
      expect(Object.keys(profile.assessments).sort()).toEqual([...COMPARISON_DIMENSIONS].sort());
    }
  });
});

describe("desafíos de arquitectura", () => {
  it("incluye los cuatro desafíos de la especificación", () => {
    expect(challenges.map((c) => c.slug).sort()).toEqual(
      ["campaign-orchestrator", "mass-collections", "multi-tenant-agents", "reliable-webhooks"].sort(),
    );
  });

  it("referencian patrones existentes y tienen diseño de referencia", () => {
    for (const challenge of challenges) {
      for (const slug of challenge.relatedPatterns)
        expect(patternExists(slug), `${challenge.slug} → ${slug}`).toBe(true);
      expect(challenge.solution.length, challenge.slug).toBeGreaterThan(500);
    }
  });
});

describe("banco de preguntas del Interview Arena", () => {
  it("tiene al menos 25 preguntas y 3 por área", () => {
    expect(questions.length).toBeGreaterThanOrEqual(25);
    for (const area of INTERVIEW_AREAS) {
      expect(questions.filter((q) => q.area === area).length, area).toBeGreaterThanOrEqual(3);
    }
  });

  it("incluye las preguntas que pide la especificación", () => {
    for (const id of [
      "iq.event-loop",
      "iq.promise-all-allsettled",
      "iq.server-components",
      "iq.idempotent-api",
      "iq.reliable-webhook",
      "iq.cqrs-vs-event-sourcing",
      "iq.outbox",
      "iq.prompt-versioning",
      "iq.evaluating-agents",
      "iq.multi-tenancy",
      "iq.bad-index",
      "iq.transaction-race",
      "iq.partial-outage",
      "iq.modular-monolith-vs-microservices",
    ]) {
      expect(questions.map((q) => q.id)).toContain(id);
    }
  });

  it("hay preguntas rápidas y deep dive suficientes para cada modo", () => {
    const nonAi = questions.filter((q) => q.area !== "ai-engineering");
    expect(nonAi.filter((q) => q.format === "quick").length).toBeGreaterThanOrEqual(8);
    expect(nonAi.filter((q) => q.format === "deep-dive").length).toBeGreaterThanOrEqual(8);
  });

  it("las lecciones y patrones relacionados existen", () => {
    for (const q of questions) {
      for (const lesson of q.relatedLessons) expect(lessonExists(lesson), `${q.id} → ${lesson}`).toBe(true);
      for (const slug of q.relatedPatterns) expect(patternExists(slug), `${q.id} → ${slug}`).toBe(true);
    }
  });
});
