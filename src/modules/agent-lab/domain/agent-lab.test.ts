import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, diffConfigs, renderSystemPrompt, validateConfig } from "./agent-config";
import { EMPTY_AGENT_LAB, checkPublish, publishWithGate, recordEvalRun } from "./agent-lab-state";
import { EXAMPLE_AGENT_ID, createAgent, publishVersion, saveVersion, updateDraft } from "./agent-registry";
import { LAB_TODAY, SEED_WORLD, customerSnapshot, debtSummary, describeChanges } from "./collections-world";
import { compareCase, evaluateGate, wilsonInterval, DEFAULT_GATE, type SuiteSummary } from "./evaluation";
import { decideContactEligibility, expirePromises, reconcile, rememberFact, type MemoryFact } from "./memory";
import { executeTool, type ToolContext } from "./tools";

const ctx = (customerId: string): ToolContext => ({
  today: LAB_TODAY,
  policies: DEFAULT_CONFIG.policies,
  sessionCustomerId: customerId,
});

describe("mundo de cobranzas", () => {
  it("calcula la deuda vencida y los días de atraso", () => {
    const debt = debtSummary(SEED_WORLD, "c-001", LAB_TODAY);
    expect(debt.overdueCents).toBe(4_500_000);
    expect(debt.overdueInstallments).toBe(1);
    expect(debt.daysPastDue).toBe(13);
    expect(debt.upcomingCents).toBe(4_500_000);
  });
});

describe("herramientas", () => {
  it("registra una promesa dentro de la política y deja un evento", () => {
    const outcome = executeTool(
      "register_payment_promise",
      SEED_WORLD,
      { customerId: "c-001", amountCents: 4_500_000, promisedDate: "2026-03-12" },
      ctx("c-001"),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.world.promises.at(-1)).toMatchObject({ id: "P-2", status: "active" });
    expect(outcome.world.events.at(-1)?.type).toBe("promise_registered");
    const changes = describeChanges(
      customerSnapshot(SEED_WORLD, "c-001"),
      customerSnapshot(outcome.world, "c-001"),
    );
    expect(changes).toContain("promesas: se agregó P-2");
  });

  it("rechaza promesas fuera de plazo o por menos de lo vencido", () => {
    const late = executeTool(
      "register_payment_promise",
      SEED_WORLD,
      { customerId: "c-001", amountCents: 4_500_000, promisedDate: "2026-03-30" },
      ctx("c-001"),
    );
    expect(late).toMatchObject({ ok: false, code: "policy_violation" });
    const short = executeTool(
      "register_payment_promise",
      SEED_WORLD,
      { customerId: "c-001", amountCents: 100_000, promisedDate: "2026-03-10" },
      ctx("c-001"),
    );
    expect(short).toMatchObject({ ok: false, code: "policy_violation" });
  });

  it("nunca opera sobre un cliente distinto al de la conversación", () => {
    const outcome = executeTool("get_debt", SEED_WORLD, { customerId: "c-002" }, ctx("c-001"));
    expect(outcome).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("aplica un pago pendiente a las cuotas más antiguas", () => {
    const outcome = executeTool(
      "confirm_payment",
      SEED_WORLD,
      { customerId: "c-003", reference: "trx-88123" },
      ctx("c-003"),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(debtSummary(outcome.world, "c-003", LAB_TODAY).overdueCents).toBe(0);
    expect(outcome.world.payments.find((p) => p.reference === "TRX-88123")?.status).toBe("applied");
  });

  it("un pedido de no contacto marca al cliente y borra contactos programados", () => {
    const scheduled = executeTool(
      "schedule_contact",
      SEED_WORLD,
      { customerId: "c-002", date: "2026-03-06", hour: 10, channel: "call", reason: "seguimiento" },
      ctx("c-002"),
    );
    if (!scheduled.ok) throw new Error(scheduled.error);
    const refusal = executeTool(
      "register_refusal",
      scheduled.world,
      { customerId: "c-002", reason: "do_not_contact" },
      ctx("c-002"),
    );
    if (!refusal.ok) throw new Error(refusal.error);
    expect(refusal.world.customers.find((c) => c.id === "c-002")?.doNotContact).toBe(true);
    expect(refusal.world.contacts.filter((c) => c.customerId === "c-002")).toHaveLength(0);
  });

  it("respeta la ventana horaria de contacto", () => {
    const outcome = executeTool(
      "schedule_contact",
      SEED_WORLD,
      { customerId: "c-001", date: "2026-03-06", hour: 22, channel: "call", reason: "pedido" },
      ctx("c-001"),
    );
    expect(outcome).toMatchObject({ ok: false, code: "policy_violation" });
  });
});

describe("configuración y versionado", () => {
  it("detecta variables del prompt sin definir e interpola las definidas", () => {
    const config = { ...DEFAULT_CONFIG, systemPrompt: "Hola {{agent_name}} de {{region}}" };
    expect(validateConfig(config).map((i) => i.field)).toContain("variables");
    expect(
      renderSystemPrompt(DEFAULT_CONFIG, {
        today: "05/03/2026",
        customer_name: "Lucía",
        customer_id: "c-001",
      }),
    ).toContain("Sos Ana, asistente virtual de cobranzas de Financiera Andina.");
  });

  it("guarda versiones inmutables, publica y registra el rollback", () => {
    const now = new Date("2026-03-05T10:00:00Z");
    let agent = createAgent("a", "Test", now);
    agent = saveVersion(agent, "v1", now);
    agent = saveVersion(
      updateDraft(agent, { ...agent.draft, policies: { ...agent.draft.policies, maxPromiseDays: 7 } }),
      "plazo corto",
      now,
    );
    expect(() => saveVersion(agent, "igual", now)).toThrow();
    agent = publishVersion(publishVersion(agent, 2, now), 1, now);
    expect(agent.history.map((h) => h.type)).toEqual(["publish", "rollback"]);
    expect(diffConfigs(agent.versions[0]!.config, agent.versions[1]!.config)).toEqual([
      { path: "policies.maxPromiseDays", before: "15", after: "7" },
    ]);
  });
});

const summary = (passRate: number, critical: string[] = []): SuiteSummary => ({
  runs: 20,
  passes: Math.round(passRate * 20),
  passRate,
  interval: wilsonInterval(Math.round(passRate * 20), 20),
  cases: [],
  criticalFailures: critical,
  flakyCases: 0,
  latencyP50Ms: 1,
  latencyP95Ms: 2,
  usage: null,
});

describe("evaluación estadística y quality gate", () => {
  it("el intervalo de Wilson es ancho con pocas repeticiones", () => {
    const three = wilsonInterval(3, 3);
    expect(three.low).toBeLessThan(0.5);
    expect(wilsonInterval(30, 30).low).toBeGreaterThan(0.85);
  });

  it("sólo declara regresión si los intervalos no se superponen", () => {
    const make = (passes: number, runs: number) => ({
      caseId: "x",
      runs,
      passes,
      passRate: passes / runs,
      interval: wilsonInterval(passes, runs),
      flaky: false,
      failures: [],
    });
    expect(compareCase(make(3, 3), make(0, 3))).toBe("noise");
    expect(compareCase(make(5, 5), make(0, 5))).toBe("regressed");
    expect(compareCase(make(0, 5), make(5, 5))).toBe("improved");
  });

  it("el gate bloquea por tasa, casos críticos y repeticiones", () => {
    expect(evaluateGate(summary(0.95), 5, DEFAULT_GATE).passed).toBe(true);
    const failed = evaluateGate(summary(0.7, ["dispute-escalation"]), 1, DEFAULT_GATE);
    expect(failed.passed).toBe(false);
    expect(failed.reasons).toHaveLength(3);
  });

  it("no permite publicar sin evaluación, pero sí hacer rollback", () => {
    const now = new Date("2026-03-05T10:00:00Z");
    expect(checkPublish(EMPTY_AGENT_LAB, EXAMPLE_AGENT_ID, 2).allowed).toBe(false);
    const evaluated = recordEvalRun(EMPTY_AGENT_LAB, {
      id: "r1",
      agentId: EXAMPLE_AGENT_ID,
      version: 2,
      providerId: "local-deterministic",
      model: null,
      at: now.toISOString(),
      repetitions: 5,
      caseIds: [],
      summary: summary(1),
    });
    const published = publishWithGate(evaluated, EXAMPLE_AGENT_ID, 2, now);
    expect(published.agents[EXAMPLE_AGENT_ID]!.publishedVersion).toBe(2);
    const rolledBack = publishWithGate(published, EXAMPLE_AGENT_ID, 1, now);
    expect(rolledBack.agents[EXAMPLE_AGENT_ID]!.history.at(-1)?.type).toBe("rollback");
  });
});

describe("memoria", () => {
  const promised = executeTool(
    "register_payment_promise",
    SEED_WORLD,
    { customerId: "c-001", amountCents: 4_500_000, promisedDate: "2026-03-15" },
    { ...ctx("c-001"), today: "2026-03-01" },
  );
  if (!promised.ok) throw new Error(promised.error);

  it("con una promesa activa no se contacta para cobrar antes de la fecha", () => {
    expect(decideContactEligibility(promised.world, [], "c-001", "2026-03-05").action).toBe("wait");
    expect(decideContactEligibility(promised.world, [], "c-001", "2026-03-14").action).toBe("reminder_only");
  });

  it("si la promesa vence sin pago, vuelve a ser elegible", () => {
    const expired = expirePromises(promised.world, "2026-03-16");
    expect(decideContactEligibility(expired, [], "c-001", "2026-03-16")).toMatchObject({
      eligible: true,
      action: "contact",
    });
  });

  it("ante una contradicción gana el sistema de registro", () => {
    const claim: MemoryFact = {
      id: "F-1",
      customerId: "c-002",
      kind: "claim",
      topic: "payment_claim",
      text: "Dice que ya pagó",
      observedAt: "2026-03-03",
      expiresAt: "2026-03-10",
      supersededBy: null,
    };
    expect(reconcile([claim], SEED_WORLD, "c-002", LAB_TODAY)).toHaveLength(1);
  });

  it("un hecho nuevo del mismo tema reemplaza al anterior", () => {
    const base = {
      customerId: "c-001",
      kind: "preference" as const,
      topic: "contact_time",
      expiresAt: null,
      supersededBy: null,
    };
    const facts = rememberFact([{ ...base, id: "F-1", text: "mañana", observedAt: "2026-02-01" }], {
      ...base,
      id: "F-2",
      text: "tarde",
      observedAt: "2026-03-01",
    });
    expect(facts[0]!.supersededBy).toBe("F-2");
  });
});
