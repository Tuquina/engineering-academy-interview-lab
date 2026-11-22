import { decideNextContact, type ContactDecision, type MemoryEvent } from "./solution";

const hold: MemoryEvent = {
  type: "hold-created",
  at: "2026-03-01",
  dueDate: "2026-03-15",
  amountCents: 150000,
};

function expectContact(
  decision: ContactDecision,
  strategy: "standard" | "deposit-reminder" | "deposit-overdue",
) {
  expect(decision.action).toBe("contact");
  if (decision.action === "contact") expect(decision.strategy).toBe(strategy);
}

test("sin eventos contacta con la estrategia estándar", () => {
  expectContact(decideNextContact([], "2026-03-05"), "standard");
});

test("con una reserva retenida vigente espera", () => {
  expect(decideNextContact([hold], "2026-03-05").action).toBe("wait");
});

test("el día anterior al vencimiento envía un recordatorio", () => {
  expectContact(decideNextContact([hold], "2026-03-14"), "deposit-reminder");
});

test("una reserva vencida sin pago genera el aviso de seña vencida", () => {
  expectContact(decideNextContact([hold], "2026-03-16"), "deposit-overdue");
});

test("cada decisión explica su motivo", () => {
  const decision = decideNextContact([hold], "2026-03-05");
  expect(decision.reason.length).toBeGreaterThan(5);
});
