import { decideNextContact, type ContactDecision, type MemoryEvent } from "./solution";

const promise: MemoryEvent = {
  type: "promise-made",
  at: "2026-03-01",
  dueDate: "2026-03-15",
  amountCents: 150000,
};

function expectContact(
  decision: ContactDecision,
  strategy: "standard" | "promise-reminder" | "broken-promise",
) {
  expect(decision.action).toBe("contact");
  if (decision.action === "contact") expect(decision.strategy).toBe(strategy);
}

test("sin eventos contacta con la estrategia estándar", () => {
  expectContact(decideNextContact([], "2026-03-05"), "standard");
});

test("con una promesa vigente espera", () => {
  expect(decideNextContact([promise], "2026-03-05").action).toBe("wait");
});

test("el día anterior al vencimiento envía un recordatorio", () => {
  expectContact(decideNextContact([promise], "2026-03-14"), "promise-reminder");
});

test("una promesa vencida sin pago es una promesa incumplida", () => {
  expectContact(decideNextContact([promise], "2026-03-16"), "broken-promise");
});

test("cada decisión explica su motivo", () => {
  const decision = decideNextContact([promise], "2026-03-05");
  expect(decision.reason.length).toBeGreaterThan(5);
});
