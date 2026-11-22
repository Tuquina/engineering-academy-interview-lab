import { decideNextContact, type MemoryEvent } from "./solution";

const hold: MemoryEvent = {
  type: "hold-created",
  at: "2026-03-01",
  dueDate: "2026-03-15",
  amountCents: 150000,
};

test("una seña cubierta por pagos no genera contacto", () => {
  const events: MemoryEvent[] = [
    hold,
    { type: "payment-received", at: "2026-03-10", amountCents: 100000 },
    { type: "payment-received", at: "2026-03-12", amountCents: 50000 },
  ];
  expect(decideNextContact(events, "2026-03-16").action).toBe("wait");
});

test(
  "un pago parcial no evita el aviso de seña vencida",
  () => {
    const events: MemoryEvent[] = [hold, { type: "payment-received", at: "2026-03-10", amountCents: 50000 }];
    const decision = decideNextContact(events, "2026-03-16");
    expect(decision.action === "contact" && decision.strategy).toBe("deposit-overdue");
  },
  { category: "edge-cases" },
);

test(
  "los pagos anteriores a la reserva no cuentan para la seña",
  () => {
    const events: MemoryEvent[] = [{ type: "payment-received", at: "2026-02-20", amountCents: 150000 }, hold];
    const decision = decideNextContact(events, "2026-03-16");
    expect(decision.action === "contact" && decision.strategy).toBe("deposit-overdue");
  },
  { category: "edge-cases" },
);

test("una cancelación posterior anula la reserva retenida", () => {
  const events: MemoryEvent[] = [hold, { type: "hold-cancelled", at: "2026-03-03" }];
  const decision = decideNextContact(events, "2026-03-05");
  expect(decision.action === "contact" && decision.strategy).toBe("standard");
});

test(
  "la reserva más reciente reemplaza a la anterior aunque los eventos lleguen desordenados",
  () => {
    const rebooked: MemoryEvent = {
      type: "hold-created",
      at: "2026-03-14",
      dueDate: "2026-03-30",
      amountCents: 150000,
    };
    const decision = decideNextContact([rebooked, hold], "2026-03-16");
    expect(decision.action).toBe("wait");
  },
  { category: "robustness" },
);

test(
  "un reclamo abierto impide contactar aunque la seña esté vencida",
  () => {
    const events: MemoryEvent[] = [hold, { type: "complaint-opened", at: "2026-03-10" }];
    expect(decideNextContact(events, "2026-03-20").action).toBe("do-not-contact");
  },
  { category: "robustness" },
);

test("si ya hubo un contacto hoy, espera", () => {
  const events: MemoryEvent[] = [hold, { type: "contact-attempt", at: "2026-03-16" }];
  expect(decideNextContact(events, "2026-03-16").action).toBe("wait");
});

test(
  "el día del vencimiento todavía se espera",
  () => {
    expect(decideNextContact([hold], "2026-03-15").action).toBe("wait");
  },
  { category: "edge-cases" },
);

test(
  "no modifica el arreglo de eventos recibido",
  () => {
    const events: MemoryEvent[] = [{ type: "contact-attempt", at: "2026-03-02" }, hold];
    const copy = JSON.stringify(events);
    decideNextContact(events, "2026-03-05");
    expect(JSON.stringify(events)).toBe(copy);
  },
  { category: "robustness" },
);
