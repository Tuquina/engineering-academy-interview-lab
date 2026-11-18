// @vitest-environment jsdom
import path from "node:path";
import * as testingLibrary from "@testing-library/react";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";
import type { Challenge, ReactChallenge } from "@/modules/challenges/domain/challenge";
import { loadChallenges } from "@/modules/challenges/infrastructure/file-system-challenge-source";
import { evaluateCommonJs } from "@/modules/exercises/domain/module-evaluator";
import { createHarness } from "@/modules/exercises/domain/test-harness";

/**
 * Verifica los challenges de React fuera de Sandpack: los tests se escriben con un subconjunto compatible con Jest
 * y con el harness propio (toBe/toEqual + Testing Library), así se pueden comprobar en CI sin conexión.
 */
const contentRoot = path.resolve(import.meta.dirname, "../../content");
let challenges: Challenge[];

beforeAll(async () => {
  challenges = await loadChallenges(contentRoot);
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

const reactChallenges = () => challenges.filter((c): c is ReactChallenge => c.kind === "react");

function transpileTsx(source: string): string {
  return ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
}

async function runReactTests(challenge: ReactChallenge, componentSource: string) {
  const libraries = {
    react: React,
    "react/jsx-runtime": jsxRuntime,
    "@testing-library/react": testingLibrary,
  };
  const app = evaluateCommonJs(transpileTsx(componentSource), libraries);
  const harness = createHarness();
  evaluateCommonJs(transpileTsx(challenge.files.tests), { ...libraries, "./App": app }, harness.globals);
  return harness.run({ defaultTimeoutMs: 2_000 });
}

describe("challenges de React", () => {
  it("existe al menos un challenge de React", () => {
    expect(reactChallenges().length).toBeGreaterThanOrEqual(1);
  });

  it("la solución de referencia pasa todos los tests", async () => {
    for (const challenge of reactChallenges()) {
      const results = await runReactTests(challenge, challenge.files.solution);
      expect(
        results.filter((r) => r.status !== "passed").map((r) => `${r.name}: ${r.error}`),
        challenge.id,
      ).toEqual([]);
    }
  }, 30_000);

  it("el starter falla al menos un test", async () => {
    for (const challenge of reactChallenges()) {
      const results = await runReactTests(challenge, challenge.files.starter);
      expect(
        results.some((r) => r.status !== "passed"),
        challenge.id,
      ).toBe(true);
    }
  }, 30_000);
});
