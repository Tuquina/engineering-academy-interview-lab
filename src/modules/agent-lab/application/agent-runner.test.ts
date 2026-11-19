import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../domain/agent-config";
import { exampleAgents, EXAMPLE_AGENT_ID } from "../domain/agent-registry";
import { LAB_TODAY, SEED_WORLD } from "../domain/collections-world";
import { BUILT_IN_CASES } from "../domain/eval-suite";
import { summarize } from "../domain/evaluation";
import { LocalDeterministicProvider } from "../infrastructure/local-deterministic-provider";
import { invokeTool } from "./invoke-tool";
import { ProviderError, type LlmProvider } from "./llm-provider";
import { runAgentTurn } from "./run-agent-turn";
import { runEvalSuite } from "./run-evals";

const provider = new LocalDeterministicProvider();
const clock = () => 0;
const deterministic = { ...DEFAULT_CONFIG, model: { ...DEFAULT_CONFIG.model, variability: 0 } };

describe("invokeTool", () => {
  it("valida el esquema antes de ejecutar", () => {
    const { trace, world } = invokeTool({
      id: "t1",
      name: "register_payment_promise",
      input: { customerId: "c-001", amountCents: "mucho", promisedDate: "15/03" },
      world: SEED_WORLD,
      allowedTools: DEFAULT_CONFIG.tools,
      today: LAB_TODAY,
      policies: DEFAULT_CONFIG.policies,
      sessionCustomerId: "c-001",
      clock,
    });
    expect(trace.status).toBe("invalid_args");
    expect(trace.validationIssues.join(" ")).toMatch(/amountCents/);
    expect(world).toBe(SEED_WORLD);
  });

  it("rechaza herramientas no habilitadas para el agente", () => {
    const { trace } = invokeTool({
      id: "t1",
      name: "get_debt",
      input: { customerId: "c-001" },
      world: SEED_WORLD,
      allowedTools: ["get_history"],
      today: LAB_TODAY,
      policies: DEFAULT_CONFIG.policies,
      sessionCustomerId: "c-001",
      clock,
    });
    expect(trace.status).toBe("not_allowed");
  });
});

describe("runAgentTurn con el proveedor local", () => {
  it("encadena herramientas: consulta la deuda y registra la promesa", async () => {
    const result = await runAgentTurn({
      config: deterministic,
      provider,
      history: [],
      userMessage: "Prometo pagar el 12",
      world: SEED_WORLD,
      memory: [],
      customerId: "c-001",
      today: LAB_TODAY,
      seed: 1,
      clock,
    });
    expect(result.outcome).toBe("answered");
    expect(result.toolCalls.map((t) => t.name)).toEqual(["get_debt", "register_payment_promise"]);
    expect(result.reply).toMatch(/asistente virtual/);
    expect(result.reply).toMatch(/12\/03\/2026/);
    expect(result.memory.some((f) => f.topic === "promise")).toBe(true);
  });

  it("es reproducible: misma semilla, misma respuesta", async () => {
    const config = { ...DEFAULT_CONFIG, model: { ...DEFAULT_CONFIG.model, variability: 1 } };
    const run = (seed: number) =>
      runAgentTurn({
        config,
        provider,
        history: [],
        userMessage: "¿Cuánto debo?",
        world: SEED_WORLD,
        memory: [],
        customerId: "c-002",
        today: LAB_TODAY,
        seed,
        clock,
      });
    expect((await run(7)).reply).toBe((await run(7)).reply);
  });

  it("reintenta errores transitorios y usa el respaldo si el proveedor sigue fallando", async () => {
    let calls = 0;
    const failing: LlmProvider = {
      id: "remote-test",
      kind: "remote",
      generate: async () => {
        calls++;
        throw new ProviderError("503", true);
      },
    };
    const result = await runAgentTurn({
      config: { ...deterministic, model: { ...deterministic.model, retries: 2 } },
      provider: failing,
      fallbackProvider: provider,
      history: [],
      userMessage: "¿Cuánto debo?",
      world: SEED_WORLD,
      memory: [],
      customerId: "c-001",
      today: LAB_TODAY,
      seed: 1,
      clock,
      sleep: async () => undefined,
    });
    expect(calls).toBe(3);
    expect(result.outcome).toBe("answered");
    expect(result.steps[0]!.providerId).toBe("local-deterministic");
    expect(result.steps[0]!.notes.at(-1)).toMatch(/respaldo/);
  });
});

describe("suite de evaluación", () => {
  const agent = exampleAgents()[EXAMPLE_AGENT_ID]!;

  it("la v2 sin variabilidad aprueba todos los casos del golden dataset", async () => {
    const runs = await runEvalSuite({
      config: { ...agent.versions[1]!.config, model: { ...agent.versions[1]!.config.model, variability: 0 } },
      cases: BUILT_IN_CASES,
      repetitions: 1,
      provider,
      baseSeed: 1,
      clock,
    });
    const failed = runs
      .filter((r) => !r.passed)
      .map((r) => ({ id: r.caseId, checks: r.checks.filter((c) => c.status === "failed") }));
    expect(failed).toEqual([]);
  });

  it("la v1 falla casos críticos de cumplimiento", async () => {
    const runs = await runEvalSuite({
      config: agent.versions[0]!.config,
      cases: BUILT_IN_CASES,
      repetitions: 3,
      provider,
      baseSeed: 1,
      clock,
    });
    const summary = summarize(runs, BUILT_IN_CASES);
    expect(summary.criticalFailures).toEqual(
      expect.arrayContaining(["dispute-escalation", "compliance-first-message"]),
    );
    expect(summary.passRate).toBeLessThan(0.8);
  });
});
