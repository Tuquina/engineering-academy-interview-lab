import { decideNextContact, type MemoryEvent } from "./solution";

const promise: MemoryEvent = {
  type: "promise-made",
  at: "2026-03-01",
  dueDate: "2026-03-15",
  amountCents: 150000,
};

test("una promesa cubierta por pagos no genera contacto", () => {
  const events: MemoryEvent[] = [
    promise,
    { type: "payment-received", at: "2026-03-10", amountCents: 100000 },
    { type: "payment-received", at: "2026-03-12", amountCents: 50000 },
  ];
  expect(decideNextContact(events, "2026-03-16").action).toBe("wait");
});

test(
  "un pago parcial no evita la gestión de promesa incumplida",
  () => {
    const events: MemoryEvent[] = [
      promise,
      { type: "payment-received", at: "2026-03-10", amountCents: 50000 },
    ];
    const decision = decideNextContact(events, "2026-03-16");
    expect(decision.action === "contact" && decision.strategy).toBe("broken-promise");
  },
  { category: "edge-cases" },
);

test(
  "los pagos anteriores a la promesa no cuentan para cumplirla",
  () => {
    const events: MemoryEvent[] = [
      { type: "payment-received", at: "2026-02-20", amountCents: 150000 },
      promise,
    ];
    const decision = decideNextContact(events, "2026-03-16");
    expect(decision.action === "contact" && decision.strategy).toBe("broken-promise");
  },
  { category: "edge-cases" },
);

test("una cancelación posterior anula la promesa", () => {
  const events: MemoryEvent[] = [promise, { type: "promise-cancelled", at: "2026-03-03" }];
  const decision = decideNextContact(events, "2026-03-05");
  expect(decision.action === "contact" && decision.strategy).toBe("standard");
});

test(
  "la promesa más reciente reemplaza a la anterior aunque los eventos lleguen desordenados",
  () => {
    const renegotiated: MemoryEvent = {
      type: "promise-made",
      at: "2026-03-14",
      dueDate: "2026-03-30",
      amountCents: 150000,
    };
    const decision = decideNextContact([renegotiated, promise], "2026-03-16");
    expect(decision.action).toBe("wait");
  },
  { category: "robustness" },
);

test(
  "una disputa abierta impide contactar aunque la promesa esté incumplida",
  () => {
    const events: MemoryEvent[] = [promise, { type: "dispute-opened", at: "2026-03-10" }];
    expect(decideNextContact(events, "2026-03-20").action).toBe("do-not-contact");
  },
  { category: "robustness" },
);

test("si ya hubo un contacto hoy, espera", () => {
  const events: MemoryEvent[] = [promise, { type: "contact-attempt", at: "2026-03-16" }];
  expect(decideNextContact(events, "2026-03-16").action).toBe("wait");
});

test(
  "el día del vencimiento todavía se espera",
  () => {
    expect(decideNextContact([promise], "2026-03-15").action).toBe("wait");
  },
  { category: "edge-cases" },
);

test(
  "no modifica el arreglo de eventos recibido",
  () => {
    const events: MemoryEvent[] = [{ type: "contact-attempt", at: "2026-03-02" }, promise];
    const copy = JSON.stringify(events);
    decideNextContact(events, "2026-03-05");
    expect(JSON.stringify(events)).toBe(copy);
  },
  { category: "robustness" },
);
