import { describe, expect as vitestExpect, it } from "vitest";
import { runExercise } from "./run-exercise";
import { deepEqual, formatValue } from "./test-harness";

const solutionJs = `
exports.sum = (a, b) => a + b;
exports.later = (v) => new Promise((resolve) => setTimeout(() => resolve(v), 5));
`;

describe("runExercise (modo tests)", () => {
  it("ejecuta tests públicos y ocultos y reporta cada resultado", async () => {
    const report = await runExercise({
      solutionJs,
      testsJs: `
        const { sum, later } = require("./solution");
        test("suma", () => expect(sum(2, 3)).toBe(5));
        test("falla a propósito", () => expect(sum(2, 2)).toBe(5), { category: "edge-cases" });
        test("async", async () => { await expect(later(1)).resolves.toBe(1); });
      `,
      hiddenTestsJs: `const { sum } = require("./solution"); test("oculto", () => expect(sum(-1, 1)).toBe(0));`,
      defaultTimeoutMs: 500,
    });
    vitestExpect(report.status).toBe("completed");
    vitestExpect(report.results.map((r) => [r.name, r.status, r.hidden, r.category])).toEqual([
      ["suma", "passed", false, "correctness"],
      ["falla a propósito", "failed", false, "edge-cases"],
      ["async", "passed", false, "correctness"],
      ["oculto", "passed", true, "correctness"],
    ]);
    vitestExpect(report.results[1]?.error).toBe("Se esperaba 5 pero se obtuvo 4");
  });

  it("marca timeout en tests que no terminan", async () => {
    const report = await runExercise({
      solutionJs: "exports.never = () => new Promise(() => {});",
      testsJs: `const { never } = require("./solution"); test("cuelga", () => never());`,
      defaultTimeoutMs: 30,
    });
    vitestExpect(report.results[0]?.status).toBe("timeout");
  });

  it("informa errores al cargar el código y bloquea imports no provistos", async () => {
    const thrown = await runExercise({
      solutionJs: "throw new TypeError('boom');",
      testsJs: "",
      defaultTimeoutMs: 50,
    });
    vitestExpect(thrown).toMatchObject({ status: "error", error: "TypeError: boom" });

    const imported = await runExercise({
      solutionJs: "require('node:fs');",
      testsJs: "",
      defaultTimeoutMs: 50,
    });
    vitestExpect(imported.error).toMatch(/No se puede importar "node:fs"/);
  });
});

describe("runExercise (modo script)", () => {
  it("captura la consola respetando el orden del event loop y espera temporizadores", async () => {
    const report = await runExercise({
      solutionJs: `
        console.log("sync");
        setTimeout(() => console.log("timeout"), 5);
        Promise.resolve().then(() => console.log("micro"));
        console.warn({ a: 1 });
      `,
      defaultTimeoutMs: 100,
      settleMs: 500,
    });
    vitestExpect(report.logs.map((l) => l.message)).toEqual(["sync", "{ a: 1 }", "micro", "timeout"]);
    vitestExpect(report.logs[1]?.level).toBe("warn");
    vitestExpect(report.pendingTimers).toBe(false);
  });

  it("corta intervalos olvidados al vencer el tiempo de espera", async () => {
    const report = await runExercise({
      solutionJs: `setInterval(() => console.log("tick"), 5);`,
      defaultTimeoutMs: 100,
      settleMs: 40,
    });
    vitestExpect(report.pendingTimers).toBe(true);
    vitestExpect(report.logs.length).toBeGreaterThan(0);
  });
});

describe("utilidades del harness", () => {
  it("compara estructuras en profundidad", () => {
    vitestExpect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    vitestExpect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(true);
    vitestExpect(deepEqual([1, 2], [2, 1])).toBe(false);
    vitestExpect(deepEqual(new Map([["k", 1]]), new Map([["k", 1]]))).toBe(true);
  });

  it("formatea valores de forma legible y acotada", () => {
    vitestExpect(formatValue("x")).toBe('"x"');
    vitestExpect(formatValue(new Error("e"))).toBe("Error: e");
    vitestExpect(formatValue(Array.from({ length: 12 }, (_, i) => i))).toBe(
      "[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, …]",
    );
  });
});
