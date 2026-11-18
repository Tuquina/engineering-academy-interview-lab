import { describe, expect, it } from "vitest";
import {
  EMPTY_PRACTICE,
  MAX_DRAFT_LENGTH,
  exerciseStatus,
  markSolutionRevealed,
  recordAttempt,
  saveDesignAnswer,
  saveDraft,
} from "./practice";

const t1 = new Date("2026-11-18T10:00:00Z");
const t2 = new Date("2026-11-18T11:00:00Z");

describe("intentos", () => {
  it("acumula intentos, guarda el mejor resultado y la primera resolución", () => {
    let state = recordAttempt(EMPTY_PRACTICE, "ex", { passed: 2, total: 5 }, t1);
    expect(exerciseStatus(state, "ex")).toBe("attempted");
    state = recordAttempt(state, "ex", { passed: 5, total: 5 }, t2);
    state = recordAttempt(state, "ex", { passed: 1, total: 5 }, t2);
    expect(state.attempts.ex).toEqual({
      attempts: 3,
      lastRunAt: t2.toISOString(),
      solvedAt: t2.toISOString(),
      bestPassed: 5,
      total: 5,
    });
    expect(exerciseStatus(state, "ex")).toBe("solved");
    expect(exerciseStatus(state, "otro")).toBe("not-started");
  });

  it("una ejecución sin tests no cuenta como resuelta", () => {
    const state = recordAttempt(EMPTY_PRACTICE, "ex", { passed: 0, total: 0 }, t1);
    expect(state.attempts.ex?.solvedAt).toBeNull();
  });
});

describe("borradores y diseño", () => {
  it("guarda, recorta y elimina borradores", () => {
    let state = saveDraft(EMPTY_PRACTICE, "ex", "const a = 1;");
    expect(state.drafts.ex).toBe("const a = 1;");
    expect(saveDraft(state, "ex", "const a = 1;")).toBe(state);
    state = saveDraft(state, "ex", "x".repeat(MAX_DRAFT_LENGTH + 10));
    expect(state.drafts.ex?.length).toBe(MAX_DRAFT_LENGTH);
    expect(saveDraft(state, "ex", "").drafts.ex).toBeUndefined();
  });

  it("guarda respuestas de diseño sin criterios duplicados", () => {
    const state = saveDesignAnswer(
      EMPTY_PRACTICE,
      "d",
      { answer: "texto", checkedCriteria: ["a", "a", "b"] },
      t1,
    );
    expect(state.design.d).toEqual({
      answer: "texto",
      checkedCriteria: ["a", "b"],
      updatedAt: t1.toISOString(),
    });
  });

  it("registra soluciones reveladas una sola vez", () => {
    const state = markSolutionRevealed(markSolutionRevealed(EMPTY_PRACTICE, "ex"), "ex");
    expect(state.solutionsRevealed).toEqual(["ex"]);
  });
});

describe("respuestas de diseño parciales", () => {
  it("actualizar el texto no pisa los criterios marcados (y viceversa)", () => {
    let state = saveDesignAnswer(EMPTY_PRACTICE, "d", { checkedCriteria: ["a"] }, t1);
    state = saveDesignAnswer(state, "d", { answer: "token bucket" }, t2);
    expect(state.design.d).toMatchObject({ answer: "token bucket", checkedCriteria: ["a"] });
    state = saveDesignAnswer(state, "d", { checkedCriteria: ["a", "b"] }, t2);
    expect(state.design.d?.answer).toBe("token bucket");
  });
});
