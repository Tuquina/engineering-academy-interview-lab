import { describe, expect, it } from "vitest";
import { EMPTY_INTERVIEWS, MAX_SESSIONS, recordSession, statsByArea, type SessionRecord } from "./history";
import { coverage, type QuestionData } from "./question";
import { EmptySessionError, buildSession, shuffle, type SessionSources } from "./session";

function question(id: string, area: QuestionData["area"], format: QuestionData["format"]): QuestionData {
  return {
    id,
    slug: id,
    area,
    format,
    question: id,
    expectedPoints: [
      { id: "a", point: "A" },
      { id: "b", point: "B" },
      { id: "c", point: "C" },
      { id: "d", point: "D" },
    ],
    followUps: [],
    commonMistakes: [],
    relatedLessons: [],
    relatedPatterns: [],
  };
}

const bank: QuestionData[] = [
  ...Array.from({ length: 8 }, (_, i) => question(`q${i}`, i % 2 ? "nodejs" : "react", "quick")),
  ...Array.from({ length: 4 }, (_, i) => question(`d${i}`, "architecture", "deep-dive")),
  ...Array.from({ length: 3 }, (_, i) => question(`ai${i}`, "ai-engineering", i ? "deep-dive" : "quick")),
  ...Array.from({ length: 3 }, (_, i) => question(`b${i}`, "behavioral", i ? "deep-dive" : "quick")),
];
const sources: SessionSources = {
  questions: bank,
  weakQuestionIds: [],
  systemDesignChallengeIds: ["sd.a", "sd.b"],
  codeChallengeIds: ["challenge.x"],
};
const fixedRandom = () => 0.3;

function session(
  id: string,
  questions: SessionRecord["questions"],
  finishedAt = "2026-11-18T10:00:00.000Z",
): SessionRecord {
  return {
    id,
    mode: "quick",
    startedAt: finishedAt,
    finishedAt,
    plannedMinutes: 8,
    elapsedSeconds: 300,
    questions,
  };
}

describe("autoevaluación", () => {
  it("calcula criterios cubiertos y faltantes ignorando IDs desconocidos o repetidos", () => {
    expect(coverage(bank[0]!, ["a", "a", "zzz", "c"])).toEqual({
      covered: ["a", "c"],
      missing: ["b", "d"],
      ratio: 0.5,
    });
  });
});

describe("armado de sesiones", () => {
  it("quick: sólo preguntas rápidas fuera de AI, en cantidad proporcional al tiempo", () => {
    const plan = buildSession("quick", { minutes: 6 }, sources, fixedRandom, "s");
    expect(plan.steps).toHaveLength(4);
    for (const step of plan.steps)
      expect(step.kind === "question" && step.questionId.startsWith("q")).toBe(true);
  });

  it("filtra por áreas y respeta los límites de duración del modo", () => {
    const plan = buildSession("quick", { minutes: 999, areas: ["nodejs"] }, sources, fixedRandom, "s");
    expect(plan.plannedMinutes).toBe(10);
    const ids = plan.steps.map((s) => (s.kind === "question" ? s.questionId : ""));
    expect(ids.every((id) => bank.find((q) => q.id === id)!.area === "nodejs")).toBe(true);
  });

  it("deep dive y AI usan sus propios conjuntos", () => {
    const deep = buildSession("deep-dive", { minutes: 20 }, sources, fixedRandom, "s");
    expect(deep.steps.every((s) => s.kind === "question" && s.questionId.startsWith("d"))).toBe(true);
    const ai = buildSession("ai-engineering", { minutes: 10 }, sources, fixedRandom, "s");
    expect(ai.steps.every((s) => s.kind === "question" && s.questionId.startsWith("ai"))).toBe(true);
  });

  it("las preguntas de comportamiento tienen su modo y no se mezclan con las técnicas", () => {
    const behavioral = buildSession("behavioral", { minutes: 15 }, sources, fixedRandom, "s");
    expect(behavioral.steps).toHaveLength(3);
    expect(behavioral.steps.every((s) => s.kind === "question" && s.questionId.startsWith("b"))).toBe(true);
    const quick = buildSession("quick", { minutes: 10 }, sources, fixedRandom, "s");
    const deep = buildSession("deep-dive", { minutes: 40 }, sources, fixedRandom, "s");
    for (const step of [...quick.steps, ...deep.steps])
      expect(step.kind === "question" && step.questionId.startsWith("b")).toBe(false);
  });

  it("system design y live coding respetan el problema elegido", () => {
    const plan = buildSession(
      "system-design",
      { minutes: 45, challengeId: "sd.b" },
      sources,
      fixedRandom,
      "s",
    );
    expect(plan.steps).toEqual([
      { kind: "system-design", challengeId: "sd.b", minutes: 45, section: "System design" },
    ]);
    const coding = buildSession("live-coding", { minutes: 30 }, sources, fixedRandom, "s");
    expect(coding.steps[0]).toMatchObject({ kind: "live-coding", challengeId: "challenge.x" });
  });

  it("la mock interview suma las secciones elegidas en orden", () => {
    const plan = buildSession(
      "mock",
      {
        minutes: 0,
        sections: {
          behavioral: true,
          quick: true,
          deepDive: false,
          ai: true,
          systemDesign: true,
          liveCoding: true,
        },
      },
      sources,
      fixedRandom,
      "s",
    );
    expect(plan.plannedMinutes).toBe(10 + 8 + 10 + 20 + 25);
    expect([...new Set(plan.steps.map((s) => s.section))]).toEqual([
      "Comportamiento",
      "Preguntas rápidas",
      "AI Engineering",
      "Live coding",
      "System design",
    ]);
  });

  it("el repaso usa las preguntas débiles y falla si no hay ninguna", () => {
    expect(() => buildSession("review", { minutes: 15 }, sources, fixedRandom, "s")).toThrow(
      EmptySessionError,
    );
    const plan = buildSession(
      "review",
      { minutes: 15 },
      { ...sources, weakQuestionIds: ["d1", "q2"] },
      fixedRandom,
      "s",
    );
    expect(plan.steps.map((s) => (s.kind === "question" ? s.questionId : ""))).toEqual(["d1", "q2"]);
  });

  it("shuffle es una permutación", () => {
    const items = [1, 2, 3, 4, 5, 6];
    expect([...shuffle(items, Math.random)].sort()).toEqual(items);
  });
});

describe("historial y puntos débiles", () => {
  it("registra los criterios faltantes y los borra cuando una respuesta posterior los cubre todos", () => {
    let state = recordSession(
      EMPTY_INTERVIEWS,
      session("s1", [{ questionId: "q0", covered: ["a"], missing: ["b", "c", "d"] }]),
    );
    expect(state.weakPoints.q0).toMatchObject({ missing: ["b", "c", "d"], attempts: 1 });
    state = recordSession(
      state,
      session("s2", [{ questionId: "q0", covered: ["a", "b"], missing: ["c", "d"] }]),
    );
    expect(state.weakPoints.q0).toMatchObject({ missing: ["c", "d"], attempts: 2 });
    state = recordSession(
      state,
      session("s3", [{ questionId: "q0", covered: ["a", "b", "c", "d"], missing: [] }]),
    );
    expect(state.weakPoints.q0).toBeUndefined();
    expect(state.sessions.map((s) => s.id)).toEqual(["s3", "s2", "s1"]);
  });

  it("conserva como máximo las sesiones más recientes", () => {
    let state = EMPTY_INTERVIEWS;
    for (let i = 0; i < MAX_SESSIONS + 5; i++) state = recordSession(state, session(`s${i}`, []));
    expect(state.sessions).toHaveLength(MAX_SESSIONS);
    expect(state.sessions[0]!.id).toBe(`s${MAX_SESSIONS + 4}`);
  });

  it("promedia la cobertura por área", () => {
    const state = recordSession(
      EMPTY_INTERVIEWS,
      session("s", [
        { questionId: "q0", covered: ["a", "b", "c", "d"], missing: [] },
        { questionId: "q2", covered: [], missing: ["a", "b", "c", "d"] },
        { questionId: "q1", covered: ["a"], missing: ["b", "c", "d"] },
      ]),
    );
    const stats = statsByArea(state, bank);
    expect(stats.find((s) => s.area === "react")).toMatchObject({
      answered: 2,
      averageCoverage: 0.5,
      weakQuestions: 1,
    });
    expect(stats.find((s) => s.area === "nodejs")).toMatchObject({ answered: 1, averageCoverage: 0.25 });
    expect(stats.find((s) => s.area === "databases")).toMatchObject({ answered: 0, averageCoverage: 0 });
  });
});
