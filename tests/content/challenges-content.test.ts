import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { Challenge, CodeChallenge } from "@/modules/challenges/domain/challenge";
import { loadChallenges } from "@/modules/challenges/infrastructure/file-system-challenge-source";
import { runExercise } from "@/modules/exercises/domain/run-exercise";
import { LearningQueries } from "@/modules/learning/application/learning-queries";
import type { Catalog } from "@/modules/learning/domain/catalog";
import { FileSystemContentSource } from "@/modules/learning/infrastructure/file-system-content-source";
import { transpile, typeCheck } from "../support/compile-typescript";

/**
 * Verificación real del contenido de los challenges: las soluciones de referencia compilan y pasan TODOS sus tests
 * (públicos y ocultos) con el mismo harness que usa el navegador, y los starters fallan al menos uno.
 * Así no se publica nunca una solución "verificada" que no lo esté.
 */
const contentRoot = path.resolve(import.meta.dirname, "../../content");
let challenges: Challenge[];
let catalog: Catalog;

beforeAll(async () => {
  challenges = await loadChallenges(contentRoot);
  catalog = await new LearningQueries(new FileSystemContentSource(contentRoot)).getCatalog();
});

const codeChallenges = () => challenges.filter((c): c is CodeChallenge => c.kind === "code");

function run(challenge: CodeChallenge, solutionSource: string) {
  return runExercise({
    solutionJs: transpile(solutionSource),
    testsJs: transpile(challenge.files.tests),
    hiddenTestsJs: transpile(challenge.files.hiddenTests),
    defaultTimeoutMs: 2_000,
  });
}

describe("catálogo de challenges", () => {
  it("tiene challenges de código con IDs únicos y lecciones relacionadas existentes", () => {
    expect(codeChallenges().length).toBeGreaterThanOrEqual(8);
    for (const challenge of challenges) {
      for (const lessonId of challenge.relatedLessons) {
        expect(catalog.getLessonById(lessonId), `${challenge.id} → ${lessonId}`).toBeDefined();
      }
    }
  });
});

describe("challenges de código", () => {
  it("las soluciones y los starters compilan sin errores de tipos junto con los tests", () => {
    for (const challenge of codeChallenges()) {
      const { solution, starter, tests, hiddenTests } = challenge.files;
      expect(
        typeCheck({ "solution.ts": solution, "tests.ts": tests, "hidden-tests.ts": hiddenTests }),
        `${challenge.id} (solución)`,
      ).toEqual([]);
      expect(
        typeCheck({ "solution.ts": starter, "tests.ts": tests, "hidden-tests.ts": hiddenTests }),
        `${challenge.id} (starter)`,
      ).toEqual([]);
    }
  });

  it("cada solución de referencia pasa todos sus tests públicos y ocultos", async () => {
    for (const challenge of codeChallenges()) {
      const report = await run(challenge, challenge.files.solution);
      const failures = report.results
        .filter((r) => r.status !== "passed")
        .map((r) => `${r.name}: ${r.error}`);
      expect(report.error, challenge.id).toBeNull();
      expect(failures, challenge.id).toEqual([]);
      expect(
        report.results.some((r) => r.hidden),
        `${challenge.id}: tests ocultos`,
      ).toBe(true);
      expect(
        report.results.some((r) => !r.hidden),
        `${challenge.id}: tests públicos`,
      ).toBe(true);
    }
  }, 60_000);

  it("cada starter falla al menos un test (el ejercicio no viene resuelto)", async () => {
    for (const challenge of codeChallenges()) {
      const report = await run(challenge, challenge.files.starter);
      const allPassed = report.status === "completed" && report.results.every((r) => r.status === "passed");
      expect(allPassed, challenge.id).toBe(false);
    }
  }, 60_000);
});
