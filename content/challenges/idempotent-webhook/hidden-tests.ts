import { createPaymentWebhookHandler, type EventStore, type Ledger } from "./solution";

function memoryStore(): EventStore {
  const ids = new Set<string>();
  return {
    async wasProcessed(eventId) {
      await sleep(5);
      return ids.has(eventId);
    },
    async markProcessed(eventId) {
      await sleep(5);
      ids.add(eventId);
    },
  };
}

function ledgerSpy(failTimes = 0): Ledger & { applied: string[] } {
  const applied: string[] = [];
  let failures = 0;
  return {
    applied,
    async applyPayment(orderId) {
      await sleep(10);
      if (failures < failTimes) {
        failures++;
        throw new Error("ledger no disponible");
      }
      applied.push(orderId);
    },
  };
}

const event = { eventId: "evt_9", orderId: "ord_9", amountCents: 1000 };

test(
  "entregas simultáneas del mismo evento aplican el pago una sola vez",
  async () => {
    const ledger = ledgerSpy();
    const handle = createPaymentWebhookHandler({ store: memoryStore(), ledger });
    const responses = await Promise.all([handle(event), handle(event), handle(event)]);
    expect(ledger.applied).toHaveLength(1);
    expect(responses.every((r) => r.status === 200)).toBe(true);
  },
  { category: "concurrency" },
);

test(
  "si el pago falla responde 500 y un reenvío posterior lo procesa",
  async () => {
    const ledger = ledgerSpy(1);
    const handle = createPaymentWebhookHandler({ store: memoryStore(), ledger });
    expect((await handle(event)).status).toBe(500);
    expect(await handle(event)).toEqual({ status: 200, body: { processed: true } });
    expect(ledger.applied).toEqual(["ord_9"]);
  },
  { category: "robustness" },
);

test(
  "valida tipos y valores de cada campo",
  async () => {
    const handle = createPaymentWebhookHandler({ store: memoryStore(), ledger: ledgerSpy() });
    const invalid: unknown[] = [
      null,
      "evento",
      {},
      { eventId: "", orderId: "d", amountCents: 1 },
      { eventId: "e", orderId: "d", amountCents: 10.5 },
      { eventId: "e", orderId: "d", amountCents: -100 },
      { eventId: "e", orderId: 42, amountCents: 100 },
    ];
    for (const payload of invalid) {
      expect((await handle(payload)).status).toBe(400);
    }
  },
  { category: "edge-cases" },
);

test(
  "eventos distintos se procesan en paralelo",
  async () => {
    const ledger = ledgerSpy();
    const handle = createPaymentWebhookHandler({ store: memoryStore(), ledger });
    const start = Date.now();
    await Promise.all(
      ["a", "b", "c", "d"].map((id) =>
        handle({ eventId: `evt_${id}`, orderId: `ord_${id}`, amountCents: 100 }),
      ),
    );
    expect(ledger.applied).toHaveLength(4);
    expect(Date.now() - start).toBeLessThan(60);
  },
  { category: "concurrency" },
);
