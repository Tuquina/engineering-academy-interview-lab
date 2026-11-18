import { createPaymentWebhookHandler, type EventStore, type Ledger } from "./solution";

/** Store en memoria con latencia, como una base de datos real. */
function memoryStore(): EventStore & { ids: Set<string> } {
  const ids = new Set<string>();
  return {
    ids,
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

function ledgerSpy(): Ledger & { applied: Array<[string, number]> } {
  const applied: Array<[string, number]> = [];
  return {
    applied,
    async applyPayment(debtId, amountCents) {
      await sleep(10);
      applied.push([debtId, amountCents]);
    },
  };
}

const event = { eventId: "evt_1", debtId: "debt_1", amountCents: 150000 };

test("procesa un evento válido", async () => {
  const ledger = ledgerSpy();
  const handle = createPaymentWebhookHandler({ store: memoryStore(), ledger });
  expect(await handle(event)).toEqual({ status: 200, body: { processed: true } });
  expect(ledger.applied).toEqual([["debt_1", 150000]]);
});

test("un reenvío posterior no aplica el pago de nuevo", async () => {
  const ledger = ledgerSpy();
  const handle = createPaymentWebhookHandler({ store: memoryStore(), ledger });
  await handle(event);
  expect(await handle(event)).toEqual({ status: 200, body: { processed: false, duplicate: true } });
  expect(ledger.applied).toHaveLength(1);
});

test(
  "rechaza payloads inválidos con 400",
  async () => {
    const ledger = ledgerSpy();
    const handle = createPaymentWebhookHandler({ store: memoryStore(), ledger });
    const response = await handle({ eventId: "evt_2", debtId: "debt_1", amountCents: "1500" });
    expect(response.status).toBe(400);
    expect(ledger.applied).toHaveLength(0);
  },
  { category: "robustness" },
);
